import { scenario } from "./clerk-server.fixture"

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
          permissions: ((await scenario()) === "denied" ? [] : reads).map(
            (key) => ({ permission: { key } })
          ),
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
    findMany: async (args: { where: { organizationId: string } }) => {
      await checkQuery(args, "order.read")
      return [
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
