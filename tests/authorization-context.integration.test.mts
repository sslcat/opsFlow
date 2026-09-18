import assert from "node:assert/strict"
import { mock, test } from "node:test"

type StoredMembership = {
  id: string
  userId: string
  organizationId: string
  roleKey: "auditor"
}

const memberships = new Map<string, StoredMembership>()
const organizations = new Map<string, { id: string; clerkOrganizationId: string }>()
const users = new Map<string, { id: string; clerkUserId: string }>()

const transactionClient = {
  organization: {
    upsert: async ({ where }: { where: { clerkOrganizationId: string } }) => {
      const existing = organizations.get(where.clerkOrganizationId)
      if (existing) return existing
      const organization = {
        id: `internal-${where.clerkOrganizationId}`,
        clerkOrganizationId: where.clerkOrganizationId,
      }
      organizations.set(where.clerkOrganizationId, organization)
      return organization
    },
  },
  user: {
    upsert: async ({ where }: { where: { clerkUserId: string } }) => {
      const existing = users.get(where.clerkUserId)
      if (existing) return existing
      const user = {
        id: `internal-${where.clerkUserId}`,
        clerkUserId: where.clerkUserId,
      }
      users.set(where.clerkUserId, user)
      return user
    },
  },
  role: {
    findUnique: async ({ where }: { where: { key: string } }) =>
      where.key === "auditor" ? { id: "role-auditor", key: "auditor" } : null,
  },
  organizationMembership: {
    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      if ("id" in where) {
        return expandedMembership(memberships.get(String(where.id)))
      }
      const composite = where.userId_organizationId as {
        userId: string
        organizationId: string
      }
      return memberships.get(`${composite.userId}:${composite.organizationId}`) ?? null
    },
    create: async ({ data }: {
      data: { userId: string; organizationId: string }
    }) => {
      const key = `${data.userId}:${data.organizationId}`
      const membership: StoredMembership = {
        id: `membership-${memberships.size + 1}`,
        userId: data.userId,
        organizationId: data.organizationId,
        roleKey: "auditor",
      }
      memberships.set(key, membership)
      return membership
    },
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const membership = [...memberships.values()].find(
        (candidate) => candidate.id === where.id,
      )
      if (!membership) throw new Error("Membership not found")
      return expandedMembership(membership)
    },
  },
}

function expandedMembership(membership: StoredMembership | undefined) {
  if (!membership) return null
  return {
    ...membership,
    roles: [
      {
        role: {
          key: "auditor",
          permissions: [
            { permission: { key: "organization.read" } },
          ],
        },
      },
    ],
  }
}

const prisma = {
  $transaction: async (operation: (client: typeof transactionClient) => unknown) =>
    operation(transactionClient),
}

mock.module("server-only", { namedExports: {} })
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma },
})

const { synchronizeAuthorizationIdentity } = await import(
  "../src/lib/authorization-identity.ts"
)
mock.restoreAll()

test("concurrent first access never elevates either member to administrator", async () => {
  const [first, second] = await Promise.all([
    synchronizeAuthorizationIdentity("user-a", "org-a"),
    synchronizeAuthorizationIdentity("user-b", "org-a"),
  ])

  assert.equal(first.roles[0]?.role.key, "auditor")
  assert.equal(second.roles[0]?.role.key, "auditor")
  assert.equal(memberships.size, 2)
  assert.deepEqual(
    [...memberships.values()].map(({ roleKey }) => roleKey),
    ["auditor", "auditor"],
  )
  assert.equal(
    [...memberships.values()].some(
      ({ roleKey }) => roleKey === ("organization_administrator" as string),
    ),
    false,
  )
})

test("identity mappings and memberships remain isolated between organizations", async () => {
  const membership = await synchronizeAuthorizationIdentity("user-a", "org-b")

  assert.equal(membership.organizationId, "internal-org-b")
  assert.notEqual(
    membership.id,
    memberships.get("internal-user-a:internal-org-a")?.id,
  )
})
