import "server-only"

import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import {
  collectEffectivePermissions,
  hasEveryPermission,
  type PermissionKey,
} from "@/lib/authorization-policy"
import { synchronizeAuthorizationIdentity } from "@/lib/authorization-identity"

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
