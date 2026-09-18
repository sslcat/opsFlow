import "dotenv/config"

import { Prisma, PrismaClient } from "@prisma/client"
import {
  getOptionalArgument,
  getRequiredArgument,
} from "./command-arguments.mts"

const prisma = new PrismaClient()
const MAX_ATTEMPTS = 3

async function provisionAdministrator() {
  const clerkOrganizationId = getRequiredArgument("clerk-organization-id")
  const clerkUserId = getRequiredArgument("clerk-user-id")
  const operator = getRequiredArgument("operator")
  const organizationName = getOptionalArgument("organization-name")

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const organization = await transaction.organization.upsert({
            where: { clerkOrganizationId },
            update: organizationName ? { name: organizationName } : {},
            create: {
              clerkOrganizationId,
              name: organizationName ?? `Clerk organization ${clerkOrganizationId}`,
            },
          })
          const user = await transaction.user.upsert({
            where: { clerkUserId },
            update: {},
            create: { clerkUserId },
          })
          const administratorRole = await transaction.role.findUnique({
            where: { key: "organization_administrator" },
          })

          if (!administratorRole) {
            throw new Error(
              "The authorization seed migration must run before provisioning",
            )
          }

          const membership =
            await transaction.organizationMembership.upsert({
              where: {
                userId_organizationId: {
                  userId: user.id,
                  organizationId: organization.id,
                },
              },
              update: {},
              create: {
                userId: user.id,
                organizationId: organization.id,
              },
              include: {
                roles: { include: { role: true } },
              },
            })
          const existingAdministrator =
            await transaction.organizationMembership.findFirst({
              where: {
                organizationId: organization.id,
                roles: {
                  some: { role: { key: "organization_administrator" } },
                },
              },
            })

          if (existingAdministrator?.id === membership.id) {
            return { organization, membership, changed: false }
          }

          if (existingAdministrator) {
            throw new Error(
              "This organization already has an initial administrator; use the role-assignment UI for later changes",
            )
          }

          await transaction.membershipRole.deleteMany({
            where: { membershipId: membership.id },
          })
          await transaction.membershipRole.create({
            data: {
              membershipId: membership.id,
              roleId: administratorRole.id,
            },
          })
          await transaction.authorizationAuditEvent.create({
            data: {
              organizationId: organization.id,
              action: "INITIAL_ADMINISTRATOR_PROVISIONED",
              actorIdentifier: operator,
              targetMembershipId: membership.id,
              metadata: {
                clerkOrganizationId,
                clerkUserId,
                previousRoleKeys: membership.roles.map(({ role }) => role.key),
              },
            },
          })

          return { organization, membership, changed: true }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")

      if (!retryable || attempt === MAX_ATTEMPTS - 1) throw error
    }
  }

  throw new Error("Administrator provisioning failed")
}

try {
  const result = await provisionAdministrator()
  console.log(
    result.changed
      ? `Provisioned ${result.membership.id} as the initial administrator for ${result.organization.id}.`
      : `Membership ${result.membership.id} is already the initial administrator for ${result.organization.id}.`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
