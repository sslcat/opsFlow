import "server-only"

import { Prisma } from "@prisma/client"
import type { SystemRoleKey } from "./authorization-policy.ts"
import { prisma } from "./prisma.ts"

const DEFAULT_MEMBERSHIP_ROLE: SystemRoleKey = "auditor"

export async function synchronizeAuthorizationIdentity(
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
            const role = await transaction.role.findUnique({
              where: { key: DEFAULT_MEMBERSHIP_ROLE },
            })

            if (!role) {
              throw new Error(
                `Required system role is missing: ${DEFAULT_MEMBERSHIP_ROLE}`,
              )
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
