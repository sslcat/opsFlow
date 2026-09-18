import "dotenv/config"

import { Prisma, PrismaClient } from "@prisma/client"
import { getRequiredArgument } from "./command-arguments.mts"

const prisma = new PrismaClient()
const LEGACY_ORGANIZATION_ID = "legacy-organization"

async function claimLegacyOrganization() {
  const clerkOrganizationId = getRequiredArgument("clerk-organization-id")
  const operator = getRequiredArgument("operator")

  return prisma.$transaction(
    async (transaction) => {
      const targetOrganization = await transaction.organization.findUnique({
        where: { clerkOrganizationId },
      })

      if (!targetOrganization) {
        throw new Error(
          "Target organization does not exist; provision its initial administrator first",
        )
      }

      if (targetOrganization.id === LEGACY_ORGANIZATION_ID) {
        throw new Error("The legacy organization cannot claim itself")
      }

      const initialAdministrator =
        await transaction.organizationMembership.findFirst({
          where: {
            organizationId: targetOrganization.id,
            roles: {
              some: { role: { key: "organization_administrator" } },
            },
          },
          select: { id: true },
        })

      if (!initialAdministrator) {
        throw new Error(
          "Target organization has no explicitly provisioned administrator",
        )
      }

      const legacyOrders = await transaction.order.findMany({
        where: { organizationId: LEGACY_ORGANIZATION_ID },
        select: { poNumber: true },
      })
      const conflictingOrder = legacyOrders.length
        ? await transaction.order.findFirst({
            where: {
              organizationId: targetOrganization.id,
              poNumber: { in: legacyOrders.map(({ poNumber }) => poNumber) },
            },
            select: { poNumber: true },
          })
        : null

      if (conflictingOrder) {
        throw new Error(
          `Legacy claim aborted: target organization already has PO ${conflictingOrder.poNumber}`,
        )
      }

      const [documents, orders, invoices, exceptions] = await Promise.all([
        transaction.document.updateMany({
          where: { organizationId: LEGACY_ORGANIZATION_ID },
          data: { organizationId: targetOrganization.id },
        }),
        transaction.order.updateMany({
          where: { organizationId: LEGACY_ORGANIZATION_ID },
          data: { organizationId: targetOrganization.id },
        }),
        transaction.invoice.updateMany({
          where: { organizationId: LEGACY_ORGANIZATION_ID },
          data: { organizationId: targetOrganization.id },
        }),
        transaction.exception.updateMany({
          where: { organizationId: LEGACY_ORGANIZATION_ID },
          data: { organizationId: targetOrganization.id },
        }),
      ])
      const counts = {
        documents: documents.count,
        orders: orders.count,
        invoices: invoices.count,
        exceptions: exceptions.count,
      }
      const claimedRecordCount = Object.values(counts).reduce(
        (total, count) => total + count,
        0,
      )

      if (claimedRecordCount > 0) {
        await transaction.authorizationAuditEvent.create({
          data: {
            organizationId: targetOrganization.id,
            action: "LEGACY_ORGANIZATION_CLAIMED",
            actorIdentifier: operator,
            metadata: {
              sourceOrganizationId: LEGACY_ORGANIZATION_ID,
              clerkOrganizationId,
              counts,
            },
          },
        })
      }

      return { targetOrganization, counts, claimedRecordCount }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

try {
  const result = await claimLegacyOrganization()
  console.log(
    result.claimedRecordCount > 0
      ? `Claimed ${result.claimedRecordCount} legacy records for ${result.targetOrganization.id}: ${JSON.stringify(result.counts)}`
      : `No unclaimed legacy records remain for ${result.targetOrganization.id}.`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
