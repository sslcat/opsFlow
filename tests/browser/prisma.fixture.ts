import { scenario } from "./clerk-server.fixture"

import type { Order } from "@prisma/client"

// Share fixture writes between the page and API bundles, never a real database.
const state = globalThis as typeof globalThis & { testOrders?: Order[] }
const createdOrders = (state.testOrders ??= [])

const reads = [
  "organization.read",
  "document.read",
  "invoice.read",
  "order.read",
  "exception.read",
  "membership.read",
  "role.read",
]
async function organizationId() {
  return (await scenario()) === "tenant-b" ? "org-b" : "org-a"
}
async function membership() {
  return {
    id: "test-member",
    userId: "test-user",
    organizationId: await organizationId(),
    user: { fullName: "Test member", email: "member@example.test" },
    roles: [
      {
        role: {
          key: "auditor",
          name: "Auditor",
          permissions: ((await scenario()) === "denied"
            ? []
            : (await scenario()) === "creator"
              ? [...reads, "order.create"]
              : reads
          ).map((key) => ({ permission: { key } })),
        },
      },
    ],
  }
}
async function checkQuery(
  args: { where?: { organizationId?: string; id?: string } },
  permission: string,
  organization = false
) {
  if (["missing", "denied", "anonymous"].includes(await scenario()))
    throw new Error("Business query ran before page access was granted")
  if (!reads.includes(permission)) throw new Error("Unexpected test query")
  if (
    (organization ? args.where?.id : args.where?.organizationId) !==
    (await organizationId())
  )
    throw new Error("Query crossed the active tenant boundary")
}
export const prisma = {
  $transaction: async (operation: (client: unknown) => unknown) =>
    operation(prisma),
  organization: {
    upsert: async () => ({ id: await organizationId() }),
    count: async (args: { where: { id: string } }) => {
      await checkQuery(args, "organization.read", true)
      return 1
    },
  },
  user: { upsert: async () => ({ id: "test-user" }) },
  organizationMembership: {
    findUnique: membership,
    findUniqueOrThrow: membership,
    findMany: async (args: { where: { organizationId: string } }) => {
      await checkQuery(args, "membership.read")
      return [await membership()]
    },
  },
  role: { findMany: async () => [{ key: "auditor", name: "Auditor" }] },
  document: {
    count: async (args: { where: { organizationId: string } }) => {
      await checkQuery(args, "document.read")
      return 2
    },
  },
  invoice: {
    findMany: async (args: { where: { organizationId: string } }) => {
      await checkQuery(args, "invoice.read")
      return [
        {
          id: "test-invoice",
          invoiceNumber: `Invoice ${await organizationId()}`,
          poNumber: "PO-1",
          vendorName: "Test vendor",
          quantity: 1,
          unitPrice: 10,
          createdAt: new Date(),
        },
      ]
    },
  },
  order: {
    create: async ({
      data,
    }: {
      data: Omit<Order, "id" | "createdAt" | "updatedAt">
    }) => {
      await checkQuery(
        { where: { organizationId: data.organizationId } },
        "order.read"
      )
      if ((await scenario()) !== "creator")
        throw new Error("Unauthorized order write")
      await new Promise((resolve) => setTimeout(resolve, 2000))
      if (data.poNumber === "FAIL-SERVER")
        throw new Error("Simulated storage failure")
      if (
        createdOrders.some(
          (order) =>
            order.organizationId === data.organizationId &&
            order.poNumber === data.poNumber
        )
      )
        throw new Error("Duplicate PO")
      const order = {
        ...data,
        id: `created-${createdOrders.length}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      createdOrders.push(order)
      return order
    },
    findMany: async (args: { where: { organizationId: string } }) => {
      await checkQuery(args, "order.read")
      const created = createdOrders.filter(
        (order) => order.organizationId === args.where.organizationId
      )
      if ((await scenario()) === "creator") return created
      return [
        ...created,
        {
          id: "test-order",
          poNumber: `Order ${await organizationId()}`,
          vendorName: "Test vendor",
          itemCode: "ITEM-1",
          quantity: 1,
          unitPrice: 10,
        },
      ]
    },
  },
  exception: {
    findMany: async (args: { where: { organizationId: string } }) => {
      await checkQuery(args, "exception.read")
      return [
        {
          id: "test-exception",
          title: `Exception ${await organizationId()}`,
          description: "Test discrepancy",
          type: "PRICE_MISMATCH",
          status: "OPEN",
          poNumber: "PO-1",
          createdAt: new Date(),
        },
      ]
    },
  },
}
