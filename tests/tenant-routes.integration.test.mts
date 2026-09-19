import assert from "node:assert/strict"
import { mock, test } from "node:test"

const ORGANIZATION_A = "organization-a"
const ORGANIZATION_B = "organization-b"
const operations: Array<{ operation: string; args: unknown }> = []
let authorizationStatus: "authorized" | "anonymous" | "forbidden" = "authorized"
let roleAssignmentMode: "member" | "last-admin" = "member"
let existingSourceInvoice = false
let allowDocumentRead = false
let invoiceAppearsInTransaction = false
let extractionText = "Invoice Number: INV-1 Purchase Order: PO-1 Vendor: Vendor Bill To: Buyer ITEM-1 Widget 12 $6 $72"

type FakePrisma = {
  [key: string]: unknown
  $transaction: (
    operation: (client: FakePrisma) => unknown,
  ) => Promise<unknown>
}

function track(operation: string, args: unknown) {
  operations.push({ operation, args })
}

const memberships = {
  member: {
    id: "membership-a-member",
    organizationId: ORGANIZATION_A,
    userId: "user-a-member",
    user: { id: "user-a-member", clerkUserId: "clerk-user-member" },
    roles: [{ role: { id: "role-auditor", key: "auditor", name: "Auditor" } }],
    createdAt: new Date(),
  },
  administrator: {
    id: "membership-a-admin",
    organizationId: ORGANIZATION_A,
    userId: "user-a-admin",
    user: { id: "user-a-admin", clerkUserId: "clerk-user-admin" },
    roles: [
      {
        role: {
          id: "role-organization-administrator",
          key: "organization_administrator",
          name: "Organization Administrator",
        },
      },
    ],
    createdAt: new Date(),
  },
}

const prisma: FakePrisma = {
  extractionRun: {
    create: async (args: unknown) => {
      track("extractionRun.create", args)
      return args
    },
  },
  organization: {
    count: async (args: unknown) => {
      track("organization.count", args)
      return 1
    },
    update: async (args: unknown) => {
      track("organization.update", args)
      return { id: ORGANIZATION_A, name: "Renamed" }
    },
    findUniqueOrThrow: async (args: unknown) => {
      track("organization.findUniqueOrThrow", args)
      return { id: ORGANIZATION_A, name: "Organization A" }
    },
  },
  document: {
    count: async (args: unknown) => {
      track("document.count", args)
      return 1
    },
    create: async (args: unknown) => {
      track("document.create", args)
      return { id: "document-created", ...(args as { data: object }).data }
    },
    findMany: async (args: unknown) => {
      track("document.findMany", args)
      return [{ id: "document-a", organizationId: ORGANIZATION_A }]
    },
    findFirst: async (args: { where: { id: string; organizationId: string } }) => {
      track("document.findFirst", args)
      return args.where.id === "document-b" ? null : {
        id: "document-a",
        organizationId: ORGANIZATION_A,
        type: "INVOICE",
        status: "UPLOADED",
        storageKey: `${ORGANIZATION_A}/opaque-key`,
      }
    },
    update: async (args: unknown) => {
      track("document.update", args)
      return args
    },
  },
  order: {
    create: async (args: unknown) => {
      track("order.create", args)
      return { id: "order-created", ...(args as { data: object }).data }
    },
    findMany: async (args: unknown) => {
      track("order.findMany", args)
      return [{ id: "order-a", organizationId: ORGANIZATION_A }]
    },
    findFirst: async (args: unknown) => {
      track("order.findFirst", args)
      return { quantity: 10, unitPrice: 5 }
    },
  },
  invoice: {
    create: async (args: unknown) => {
      track("invoice.create", args)
      return { id: "invoice-created", ...(args as { data: object }).data }
    },
    findMany: async (args: unknown) => {
      track("invoice.findMany", args)
      return [{ id: "invoice-a", organizationId: ORGANIZATION_A }]
    },
    findFirst: async (args: unknown) => {
      track("invoice.findFirst", args)
      return existingSourceInvoice
        ? {
            id: "invoice-a",
            organizationId: ORGANIZATION_A,
            invoiceNumber: "INV-1",
            poNumber: "PO-1",
            vendorName: "Vendor",
            itemCode: "ITEM-1",
            quantity: 10,
            unitPrice: 5,
          }
        : null
    },
  },
  exception: {
    create: async (args: unknown) => {
      track("exception.create", args)
      return { id: "exception-created", ...(args as { data: object }).data }
    },
    findMany: async (args: unknown) => {
      track("exception.findMany", args)
      return [{ id: "exception-a", organizationId: ORGANIZATION_A }]
    },
    findFirst: async (args: { where: { id: string; organizationId: string } }) => {
      track("exception.findFirst", args)
      return args.where.id === "exception-b" ? null : {
        id: "exception-a",
        organizationId: ORGANIZATION_A,
      }
    },
    update: async (args: unknown) => {
      track("exception.update", args)
      return { id: "exception-a", status: "RESOLVED" }
    },
  },
  organizationMembership: {
    findMany: async (args: unknown) => {
      track("organizationMembership.findMany", args)
      return Object.values(memberships)
    },
    findFirst: async (args: { where: { id: string; organizationId: string } }) => {
      track("organizationMembership.findFirst", args)
      if (args.where.organizationId !== ORGANIZATION_A) return null
      if (args.where.id === memberships.member.id) return memberships.member
      if (args.where.id === memberships.administrator.id) {
        return memberships.administrator
      }
      return null
    },
    findUniqueOrThrow: async (args: { where: { id: string } }) => {
      track("organizationMembership.findUniqueOrThrow", args)
      return args.where.id === memberships.administrator.id
        ? memberships.administrator
        : memberships.member
    },
  },
  membershipRole: {
    count: async (args: unknown) => {
      track("membershipRole.count", args)
      return roleAssignmentMode === "last-admin" ? 1 : 2
    },
    deleteMany: async (args: unknown) => {
      track("membershipRole.deleteMany", args)
      return { count: 1 }
    },
    create: async (args: unknown) => {
      track("membershipRole.create", args)
      return args
    },
  },
  role: {
    findMany: async (args: unknown) => {
      track("role.findMany", args)
      return [
        { id: "role-auditor", key: "auditor", name: "Auditor" },
        {
          id: "role-organization-administrator",
          key: "organization_administrator",
          name: "Organization Administrator",
        },
      ]
    },
    findUnique: async ({ where }: { where: { key: string } }) => {
      track("role.findUnique", { where })
      return {
        id: `role-${where.key.replaceAll("_", "-")}`,
        key: where.key,
        name: where.key,
      }
    },
  },
  authorizationAuditEvent: {
    create: async (args: unknown) => {
      track("authorizationAuditEvent.create", args)
      return args
    },
  },
  $transaction: async (operation: (client: FakePrisma) => unknown) => {
    const previous = existingSourceInvoice
    if (invoiceAppearsInTransaction) existingSourceInvoice = true
    try { return await operation(prisma) } finally { existingSourceInvoice = previous }
  },
}

async function authorizeApiRequest() {
  if (authorizationStatus === "anonymous") {
    return {
      context: null,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    }
  }

  if (authorizationStatus === "forbidden") {
    return {
      context: null,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return {
    context: {
      clerkUserId: "clerk-user-admin",
      clerkOrganizationId: "clerk-organization-a",
      userId: "user-a-admin",
      organizationId: ORGANIZATION_A,
      membershipId: memberships.administrator.id,
      permissions: new Set<string>(),
    },
    response: null,
  }
}

const uploadCalls: string[] = []

mock.module("server-only", { namedExports: {} })
mock.module(new URL("../src/lib/auth.ts", import.meta.url).href, {
  namedExports: { authorizeApiRequest },
})
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma },
})
mock.module(new URL("../src/lib/uploads.ts", import.meta.url).href, {
  namedExports: {
    storeUpload: async (storageKey: string) => {
      uploadCalls.push(`store:${storageKey}`)
    },
    readUpload: async (storageKey: string) => {
      uploadCalls.push(`read:${storageKey}`)
      if (allowDocumentRead) return Buffer.from("%PDF-1.4")
      throw new Error("An unexpected document must not be read")
    },
    deleteUpload: async (storageKey: string) => {
      uploadCalls.push(`delete:${storageKey}`)
    },
  },
})
mock.module("node:fs/promises", {
  namedExports: {
    mkdir: async () => undefined,
    readFile: async () => {
      throw new Error("A cross-tenant document must not be read")
    },
    writeFile: async (filePath: string) => {
      uploadCalls.push(`write:${filePath}`)
    },
  },
})

const engine = await import("../src/lib/extraction/engine.ts")
const { regexProvider } = await import("../src/lib/extraction/regex-provider.ts")
mock.module(new URL("../src/lib/extraction/engine.ts", import.meta.url).href, {
  namedExports: {
    ...engine,
    extractInvoiceDocument: async (input: { document: Buffer; metadata: { documentId: string; fileName: string } }) =>
      engine.extractInvoice({ ...input, text: extractionText }, [regexProvider]),
  },
})

const organizationsRoute = await import("../src/app/api/organizations/route.ts")
const documentsRoute = await import("../src/app/api/documents/route.ts")
const ordersRoute = await import("../src/app/api/orders/route.ts")
const invoicesRoute = await import("../src/app/api/invoices/route.ts")
const exceptionsRoute = await import("../src/app/api/exceptions/route.ts")
const exceptionRoute = await import("../src/app/api/exceptions/[id]/route.ts")
const uploadRoute = await import("../src/app/api/upload/route.ts")
const processInvoiceRoute = await import("../src/app/api/process-invoice/route.ts")
const parseRoute = await import("../src/app/api/parse/route.ts")
const extractRoute = await import("../src/app/api/extract/route.ts")
const membershipsRoute = await import("../src/app/api/memberships/route.ts")
const membershipRoleRoute = await import(
  "../src/app/api/memberships/[id]/role/route.ts"
)
const tenantPageData = await import("../src/lib/tenant-page-data.ts")

const protectedHandlers: Array<() => Promise<Response>> = [
  () => organizationsRoute.GET(),
  () => organizationsRoute.POST(new Request("http://opsflow/api/organizations", { method: "POST" })),
  () => documentsRoute.GET(),
  () => documentsRoute.POST(new Request("http://opsflow/api/documents", { method: "POST" })),
  () => ordersRoute.GET(),
  () => ordersRoute.POST(new Request("http://opsflow/api/orders", { method: "POST" })),
  () => invoicesRoute.GET(),
  () => invoicesRoute.POST(new Request("http://opsflow/api/invoices", { method: "POST" })),
  () => exceptionsRoute.GET(),
  () => exceptionsRoute.POST(new Request("http://opsflow/api/exceptions", { method: "POST" })),
  () => exceptionRoute.PATCH(
    new Request("http://opsflow/api/exceptions/id", { method: "PATCH" }),
    { params: Promise.resolve({ id: "id" }) },
  ),
  () => uploadRoute.POST(new Request("http://opsflow/api/upload", { method: "POST" })),
  () => processInvoiceRoute.POST(new Request("http://opsflow/api/process-invoice", { method: "POST" })),
  () => parseRoute.POST(new Request("http://opsflow/api/parse", { method: "POST" })),
  () => extractRoute.POST(new Request("http://opsflow/api/extract", { method: "POST" })),
  () => membershipsRoute.GET(),
  () => membershipRoleRoute.PUT(
    new Request("http://opsflow/api/memberships/id/role", { method: "PUT" }),
    { params: Promise.resolve({ id: "id" }) },
  ),
]

test("every API handler rejects anonymous and missing-permission requests before I/O", async () => {
  for (const status of ["anonymous", "forbidden"] as const) {
    authorizationStatus = status
    operations.length = 0
    uploadCalls.length = 0

    const expectedStatus = status === "anonymous" ? 401 : 403
    for (const invoke of protectedHandlers) {
      const response = await invoke()
      assert.equal(response.status, expectedStatus)
    }

    assert.equal(operations.length, 0)
    assert.equal(uploadCalls.length, 0)
  }
})

test("collection reads and mutations always use the active organization", async () => {
  authorizationStatus = "authorized"
  operations.length = 0

  await organizationsRoute.GET()
  await organizationsRoute.POST(jsonRequest("/api/organizations", { name: "Renamed" }))
  await documentsRoute.GET()
  await documentsRoute.POST(jsonRequest("/api/documents", { fileName: "invoice.pdf", type: "INVOICE" }))
  await ordersRoute.GET()
  await ordersRoute.POST(jsonRequest("/api/orders", {
    poNumber: "PO-1", quantity: 10, unitPrice: 5,
  }))
  await invoicesRoute.GET()
  await invoicesRoute.POST(jsonRequest("/api/invoices", {
    invoiceNumber: "INV-1", poNumber: "PO-1", quantity: 10, unitPrice: 5,
  }))
  await exceptionsRoute.GET()
  await exceptionsRoute.POST(jsonRequest("/api/exceptions", {
    title: "Review", type: "PRICE_MISMATCH",
  }))
  await membershipsRoute.GET()

  assert.ok(operations.length > 0)
  for (const { operation, args } of operations) {
    const serialized = JSON.stringify(args)
    if (operation.startsWith("role.")) continue
    assert.match(
      serialized,
      new RegExp(ORGANIZATION_A),
      `${operation} did not carry the active organization`,
    )
    assert.doesNotMatch(serialized, new RegExp(ORGANIZATION_B))
  }
})

test("cross-tenant resource identifiers return 404 before storage or mutation", async () => {
  authorizationStatus = "authorized"
  operations.length = 0
  uploadCalls.length = 0

  const exceptionResponse = await exceptionRoute.PATCH(
    jsonRequest("/api/exceptions/exception-b", { status: "RESOLVED" }, "PATCH"),
    { params: Promise.resolve({ id: "exception-b" }) },
  )
  const extractResponse = await extractRoute.POST(
    jsonRequest("/api/extract", { documentId: "document-b" }),
  )
  const processResponse = await processInvoiceRoute.POST(
    jsonRequest("/api/process-invoice", { documentId: "document-b" }),
  )

  assert.equal(exceptionResponse.status, 404)
  assert.equal(extractResponse.status, 404)
  assert.equal(processResponse.status, 404)
  assert.equal(
    operations.some(({ operation }) => operation === "exception.update"),
    false,
  )
  assert.equal(uploadCalls.length, 0)
})

test("dashboard and list page data sources are tenant scoped", async () => {
  operations.length = 0

  await Promise.all([
    tenantPageData.getDashboardData(ORGANIZATION_A),
    tenantPageData.getOrdersPageData(ORGANIZATION_A),
    tenantPageData.getInvoicesPageData(ORGANIZATION_A),
    tenantPageData.getExceptionsPageData(ORGANIZATION_A),
  ])

  assert.ok(operations.length >= 6)
  for (const { operation, args } of operations) {
    assert.match(
      JSON.stringify(args),
      new RegExp(ORGANIZATION_A),
      `${operation} page query was not tenant scoped`,
    )
  }
})

test("uploaded document storage and metadata are scoped to the active organization", async () => {
  authorizationStatus = "authorized"
  operations.length = 0
  uploadCalls.length = 0

  const formData = new FormData()
  formData.set("file", new File(["%PDF-1.4\n"], "../invoice.pdf", { type: "application/pdf" }))
  formData.set("type", "INVOICE")
  const response = await uploadRoute.POST(
    new Request("http://opsflow/api/upload", { method: "POST", body: formData }),
  )

  assert.equal(response.status, 200)
  const create = operations.find(({ operation }) => operation === "document.create")
  const data = (create?.args as { data: { organizationId: string; storageKey: string; fileName: string } }).data
  assert.equal(data.organizationId, ORGANIZATION_A)
  assert.equal(data.fileName, "invoice.pdf")
  assert.match(data.storageKey, new RegExp(`^${ORGANIZATION_A}/`))
  assert.ok(uploadCalls.every((call) => !call.includes("..")))
})

test("upload validation rejects disguised and oversized files before storage", async () => {
  authorizationStatus = "authorized"
  uploadCalls.length = 0

  const disguised = new FormData()
  disguised.set("file", new File(["not a pdf"], "invoice.pdf", { type: "application/pdf" }))
  disguised.set("type", "INVOICE")
  const disguisedResponse = await uploadRoute.POST(
    new Request("http://opsflow/api/upload", { method: "POST", body: disguised }),
  )

  const oversized = new FormData()
  oversized.set(
    "file",
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], "invoice.pdf", {
      type: "application/pdf",
    }),
  )
  oversized.set("type", "INVOICE")
  const oversizedResponse = await uploadRoute.POST(
    new Request("http://opsflow/api/upload", { method: "POST", body: oversized }),
  )

  assert.equal(disguisedResponse.status, 400)
  assert.equal(oversizedResponse.status, 400)
  assert.equal(uploadCalls.length, 0)
})

test("reprocessing a linked document returns its invoice without reading storage", async () => {
  authorizationStatus = "authorized"
  existingSourceInvoice = true
  uploadCalls.length = 0

  const response = await processInvoiceRoute.POST(
    jsonRequest("/api/process-invoice", { documentId: "document-a" }),
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.idempotent, true)
  assert.equal(body.invoice.id, "invoice-a")
  assert.equal(uploadCalls.length, 0)
  existingSourceInvoice = false
})

test("role assignment hides foreign memberships and preserves the last administrator", async () => {
  authorizationStatus = "authorized"
  roleAssignmentMode = "member"

  const foreignResponse = await membershipRoleRoute.PUT(
    jsonRequest("/api/memberships/membership-b/role", { roleKey: "controller" }, "PUT"),
    { params: Promise.resolve({ id: "membership-b" }) },
  )
  assert.equal(foreignResponse.status, 404)

  roleAssignmentMode = "last-admin"
  const demotionResponse = await membershipRoleRoute.PUT(
    jsonRequest(
      `/api/memberships/${memberships.administrator.id}/role`,
      { roleKey: "auditor" },
      "PUT",
    ),
    { params: Promise.resolve({ id: memberships.administrator.id }) },
  )
  assert.equal(demotionResponse.status, 409)
})

function jsonRequest(path: string, body: object, method = "POST") {
  return new Request(`http://opsflow${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("document extraction persists tenant audit and runs existing mismatch checks", async () => {
  authorizationStatus = "authorized"
  allowDocumentRead = true
  operations.length = 0
  try {
    const response = await processInvoiceRoute.POST(jsonRequest("/api/process-invoice", { documentId: "document-a" }))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.parsed.quantity, 12)
    assert.equal(body.extraction.attempts[0].provider, "regex")
    assert.equal(operations.filter(op => op.operation === "invoice.create").length, 1)
    assert.equal(operations.filter(op => op.operation === "exception.create").length, 2)
    const audit = operations.find(op => op.operation === "extractionRun.create")
    assert.match(JSON.stringify(audit?.args), /organization-a/)
    assert.match(JSON.stringify(audit?.args), /document-a/)
    assert.match(JSON.stringify(operations.find(op => op.operation === "document.update")?.args), /PARSED/)
  } finally { allowDocumentRead = false }
})

test("extraction failure is audited and marks document failed without invoice or exceptions", async () => {
  authorizationStatus = "authorized"
  allowDocumentRead = true
  const original = extractionText
  try {
    const labelled = "Invoice Number: INV-1 Purchase Order: PO-1 Vendor: Vendor Quantity: "
    for (const text of [
      "invalid invoice", original + " ITEM-2 Other 1 $5 $5",
      labelled + "1.5 Unit Price: $5",
      labelled + "10 Unit Price: $5 Quantity: 20 Unit Price: $7",
    ]) {
      extractionText = text
      operations.length = 0
      const response = await processInvoiceRoute.POST(jsonRequest("/api/process-invoice", { documentId: "document-a" }))
      assert.equal(response.status, 400)
      assert.ok(operations.some(op => op.operation === "extractionRun.create"))
      assert.equal(operations.some(op => op.operation === "invoice.create" || op.operation === "exception.create"), false)
      assert.match(JSON.stringify(operations.find(op => op.operation === "document.update")?.args), /FAILED/)
    }
  } finally { allowDocumentRead = false; extractionText = original }
})

test("a concurrent invoice success cannot be downgraded by failed extraction", async () => {
  authorizationStatus = "authorized"
  allowDocumentRead = true
  invoiceAppearsInTransaction = true
  const original = extractionText
  extractionText = "invalid invoice"
  operations.length = 0
  try {
    const response = await processInvoiceRoute.POST(jsonRequest("/api/process-invoice", { documentId: "document-a" }))
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(body.idempotent, true)
    assert.equal(body.parsed.invoiceNumber, "INV-1")
    assert.equal(operations.some(op => op.operation === "document.update" || op.operation === "invoice.create"), false)
  } finally {
    allowDocumentRead = false
    invoiceAppearsInTransaction = false
    extractionText = original
  }
})
