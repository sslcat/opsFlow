import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { PrismaClient } from "@prisma/client"

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const databaseTestsEnabled = process.env.ALLOW_DATABASE_TESTS === "true"
const shouldRun = Boolean(testDatabaseUrl && databaseTestsEnabled)
const prisma = shouldRun
  ? new PrismaClient({ datasourceUrl: testDatabaseUrl })
  : null

const runId = randomUUID()
const organizationAId = `test-org-a-${runId}`
const organizationBId = `test-org-b-${runId}`
const documentAId = `test-document-a-${runId}`
const documentBId = `test-document-b-${runId}`

before(async () => {
  if (!prisma) return

  await prisma.organization.createMany({
    data: [
      { id: organizationAId, name: "Database Test Organization A" },
      { id: organizationBId, name: "Database Test Organization B" },
    ],
  })

  await prisma.document.createMany({
    data: [
      {
        id: documentAId,
        organizationId: organizationAId,
        fileName: "invoice-a.pdf",
        storageKey: `${organizationAId}/${randomUUID()}.pdf`,
        type: "INVOICE",
      },
      {
        id: documentBId,
        organizationId: organizationBId,
        fileName: "invoice-b.pdf",
        storageKey: `${organizationBId}/${randomUUID()}.pdf`,
        type: "INVOICE",
      },
    ],
  })
})

after(async () => {
  if (!prisma) return

  await prisma.document.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  })
  await prisma.organization.deleteMany({
    where: { id: { in: [organizationAId, organizationBId] } },
  })
  await prisma.$disconnect()
})

test(
  "database-backed tenant reads isolate organizations",
  { skip: shouldRun ? false : "Set TEST_DATABASE_URL and ALLOW_DATABASE_TESTS=true" },
  async () => {
    assert.ok(prisma)

    const documents = await prisma.document.findMany({
      where: { organizationId: organizationAId },
      select: { id: true, organizationId: true },
    })

    assert.deepEqual(documents, [
      { id: documentAId, organizationId: organizationAId },
    ])
  },
)

test(
  "database-backed composite identifiers reject cross-tenant mutation",
  { skip: shouldRun ? false : "Set TEST_DATABASE_URL and ALLOW_DATABASE_TESTS=true" },
  async () => {
    assert.ok(prisma)

    await assert.rejects(
      prisma.document.update({
        where: {
          id_organizationId: {
            id: documentBId,
            organizationId: organizationAId,
          },
        },
        data: { status: "PARSED" },
      }),
    )

    const unchanged = await prisma.document.findUniqueOrThrow({
      where: { id: documentBId },
    })
    assert.equal(unchanged.status, "UPLOADED")
  },
)
