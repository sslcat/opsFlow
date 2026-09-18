import "server-only"

import { auth } from "@clerk/nextjs/server"
import { Prisma } from "@prisma/client"
import { notFound, redirect } from "next/navigation"
import {
  collectEffectivePermissions,
  hasEveryPermission,
  type PermissionKey,
  type SystemRoleKey,
} from "@/lib/authorization-policy"
import { prisma } from "@/lib/prisma"

export type AuthorizationContext = {
  clerkUserId: string
  clerkOrganizationId: string
  userId: string
  organizationId: string
  membershipId: string
  permissions: ReadonlySet<PermissionKey>
}

type AuthorizationFailure = {
  context: null
  status: 401 | 403
  error: string
}

type AuthorizationSuccess = {
  context: AuthorizationContext
  status: null
  error: null
}

export type AuthorizationResolution =
  | AuthorizationFailure
  | AuthorizationSuccess

const FIRST_MEMBERSHIP_ROLE: SystemRoleKey = "organization_administrator"
const DEFAULT_MEMBERSHIP_ROLE: SystemRoleKey = "auditor"

async function synchronizeAuthorizationIdentity(
  clerkUserId: string,
  clerkOrganizationId: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const organization = await transaction.organization.upsert({
            where: { clerkOrganizationId },
            update: {},
            create: {
              clerkOrganizationId,
              name: `Clerk organization ${clerkOrganizationId}`,
            },
          })

          const user = await transaction.user.upsert({
            where: { clerkUserId },
            update: {},
            create: { clerkUserId },
          })

          let membership = await transaction.organizationMembership.findUnique({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: organization.id,
              },
            },
          })

          if (!membership) {
            const membershipCount =
              await transaction.organizationMembership.count({
                where: { organizationId: organization.id },
              })
            const roleKey = membershipCount === 0
              ? FIRST_MEMBERSHIP_ROLE
              : DEFAULT_MEMBERSHIP_ROLE
            const role = await transaction.role.findUnique({
              where: { key: roleKey },
            })

            if (!role) {
              throw new Error(`Required system role is missing: ${roleKey}`)
            }

            membership = await transaction.organizationMembership.create({
              data: {
                userId: user.id,
                organizationId: organization.id,
                roles: {
                  create: { roleId: role.id },
                },
              },
            })
          }

          return transaction.organizationMembership.findUniqueOrThrow({
            where: { id: membership.id },
            include: {
              roles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          })
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      )
    } catch (error) {
      const isRetryableConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")

      if (!isRetryableConflict || attempt === 2) {
        throw error
      }
    }
  }

  throw new Error("Authorization identity synchronization failed")
}

export async function getAuthorizationContext(): Promise<AuthorizationResolution> {
  const { userId: clerkUserId, orgId: clerkOrganizationId } = await auth()

  if (!clerkUserId) {
    return {
      context: null,
      status: 401,
      error: "Authentication required",
    }
  }

  if (!clerkOrganizationId) {
    return {
      context: null,
      status: 403,
      error: "An active organization is required",
    }
  }

  const membership = await synchronizeAuthorizationIdentity(
    clerkUserId,
    clerkOrganizationId,
  )
  const permissions = collectEffectivePermissions(
    membership.roles.flatMap((membershipRole) =>
      membershipRole.role.permissions.map((rolePermission) =>
        rolePermission.permission.key
      )
    ),
  )

  return {
    context: {
      clerkUserId,
      clerkOrganizationId,
      userId: membership.userId,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      permissions,
    },
    status: null,
    error: null,
  }
}

export async function authorizeApiRequest(
  required: PermissionKey | readonly PermissionKey[],
) {
  const resolution = await getAuthorizationContext()

  if (!resolution.context) {
    return {
      context: null,
      response: Response.json(
        { error: resolution.error },
        { status: resolution.status },
      ),
    }
  }

  const requiredPermissions = Array.isArray(required) ? required : [required]

  if (!hasEveryPermission(resolution.context.permissions, requiredPermissions)) {
    return {
      context: null,
      response: Response.json(
        { error: "You do not have permission to perform this action" },
        { status: 403 },
      ),
    }
  }

  return { context: resolution.context, response: null }
}

export async function requirePagePermission(
  required: PermissionKey | readonly PermissionKey[],
) {
  const resolution = await getAuthorizationContext()

  if (!resolution.context) {
    if (resolution.status === 401) {
      redirect("/sign-in")
    }

    notFound()
  }

  const requiredPermissions = Array.isArray(required) ? required : [required]

  if (!hasEveryPermission(resolution.context.permissions, requiredPermissions)) {
    notFound()
  }

  return resolution.context
}
