import "server-only"

import { prisma } from "./prisma.ts"

export async function getDashboardData(organizationId: string) {
  const [organizationCount, documentCount, exceptions] = await Promise.all([
    prisma.organization.count({ where: { id: organizationId } }),
    prisma.document.count({ where: { organizationId } }),
    prisma.exception.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return { organizationCount, documentCount, exceptions }
}

export function getOrdersPageData(organizationId: string) {
  return prisma.order.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })
}

export function getInvoicesPageData(organizationId: string) {
  return prisma.invoice.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })
}

export function getExceptionsPageData(organizationId: string) {
  return prisma.exception.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })
}
