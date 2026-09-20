import assert from "node:assert/strict"
import { mock, test } from "node:test"
import * as nodeModule from "node:module"
import type { ResolveFnOutput, ResolveHookContext } from "node:module"

// This suite already requires modern Node module mocks. Keep the Node 22+
// synchronous hook signature local while the app retains its Node 20 typings.
type SyncResolve = (
  specifier: string,
  context: ResolveHookContext
) => ResolveFnOutput
const { registerHooks } = nodeModule as typeof nodeModule & {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: ResolveHookContext,
      nextResolve: SyncResolve
    ) => ResolveFnOutput
  }) => { deregister: () => void }
}

// Module mocks resolve synchronously; mirror the test loader's Next entrypoint
// and TypeScript aliases while loading this page-boundary integration test.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation")
      return nextResolve("next/navigation.js", context)
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context
      )
    }
    return nextResolve(specifier, context)
  },
})

let session: { userId: string | null; orgId: string | null } = {
  userId: "user-a",
  orgId: null,
}
let permissionKeys: string[] = []
let identityCalls = 0
let identityFailure = false

mock.module("server-only", { namedExports: {} })
mock.module("@clerk/nextjs/server", {
  namedExports: { auth: async () => session },
})
mock.module("next/navigation.js", {
  namedExports: {
    redirect: (url: string) => {
      throw new Error(`redirect:${url}`)
    },
    notFound: () => {
      throw new Error("unexpected-not-found")
    },
  },
})
mock.module(
  new URL("../src/lib/authorization-identity.ts", import.meta.url).href,
  {
    namedExports: {
      synchronizeAuthorizationIdentity: async (
        _userId: string,
        organizationId: string
      ) => {
        identityCalls++
        if (identityFailure) throw new Error("identity unavailable")
        return {
          id: "membership-a",
          userId: "internal-user-a",
          organizationId,
          roles: [
            {
              role: {
                permissions: permissionKeys.map((key) => ({
                  permission: { key },
                })),
              },
            },
          ],
        }
      },
    },
  }
)

const { getWorkspacePageContext } =
  await import("../src/components/workspace-page-access.ts")
const { authorizeApiRequest, requirePagePermission } =
  await import("../src/lib/authorization.ts")
mock.restoreAll()
hooks.deregister()

test("workspace pages keep anonymous sign-in redirects and avoid identity I/O", async () => {
  session = { userId: null, orgId: null }
  identityCalls = 0
  await assert.rejects(
    getWorkspacePageContext("invoice.read"),
    /redirect:\/sign-in/
  )
  assert.equal(identityCalls, 0)
  assert.equal(
    (await authorizeApiRequest("invoice.read")).response?.status,
    401
  )
})

test("missing active organization renders an access state rather than a route 404", async () => {
  session = { userId: "user-a", orgId: null }
  identityCalls = 0
  // Reproduce the exact guard behavior that made existing routes look missing.
  await assert.rejects(
    requirePagePermission("invoice.read"),
    /unexpected-not-found/
  )
  assert.equal(await getWorkspacePageContext("invoice.read"), null)
  assert.equal(identityCalls, 0)
  assert.equal(
    (await authorizeApiRequest("invoice.read")).response?.status,
    403
  )
})

test("workspace access still requires every existing business permission", async () => {
  session = { userId: "user-a", orgId: "org-a" }
  permissionKeys = ["membership.read"]
  assert.equal(
    await getWorkspacePageContext(["membership.read", "role.read"]),
    null
  )
  assert.equal(
    (await authorizeApiRequest(["membership.read", "role.read"])).response
      ?.status,
    403
  )
  permissionKeys.push("role.read")
  assert.equal(
    (await getWorkspacePageContext(["membership.read", "role.read"]))
      ?.organizationId,
    "org-a"
  )
})

test("workspace context follows organization switching without a cached tenant", async () => {
  permissionKeys = ["invoice.read"]
  session = { userId: "user-a", orgId: "org-a" }
  assert.equal(
    (await getWorkspacePageContext("invoice.read"))?.organizationId,
    "org-a"
  )
  session = { userId: "user-a", orgId: "org-b" }
  assert.equal(
    (await getWorkspacePageContext("invoice.read"))?.organizationId,
    "org-b"
  )
  session = { userId: "user-a", orgId: null }
  assert.equal(await getWorkspacePageContext("invoice.read"), null)
})

test("unexpected identity failures are not disguised as missing routes or permission denials", async () => {
  session = { userId: "user-a", orgId: "org-a" }
  identityFailure = true
  await assert.rejects(
    getWorkspacePageContext("invoice.read"),
    /identity unavailable/
  )
  identityFailure = false
})
