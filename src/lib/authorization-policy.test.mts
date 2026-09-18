import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  collectEffectivePermissions,
  hasEveryPermission,
  isPermissionKey,
  PERMISSION_KEYS,
  SYSTEM_ROLE_KEYS,
} from "./authorization-policy.ts"

test("authorization keys are stable and unique", () => {
  assert.equal(new Set(PERMISSION_KEYS).size, PERMISSION_KEYS.length)
  assert.equal(new Set(SYSTEM_ROLE_KEYS).size, SYSTEM_ROLE_KEYS.length)
  assert.equal(isPermissionKey("exception.resolve"), true)
  assert.equal(isPermissionKey("organization_administrator"), false)
})

test("permissions are additive and every required permission must be present", () => {
  const effectivePermissions = collectEffectivePermissions([
    "invoice.read",
    "exception.read",
    "invoice.read",
    "unknown.permission",
  ])

  assert.deepEqual(
    [...effectivePermissions],
    ["invoice.read", "exception.read"],
  )
  assert.equal(hasEveryPermission(effectivePermissions, ["invoice.read"]), true)
  assert.equal(
    hasEveryPermission(effectivePermissions, [
      "invoice.read",
      "exception.resolve",
    ]),
    false,
  )
})

test("the authorization migration seeds every policy key", () => {
  const migration = readFileSync(
    new URL(
      "../../prisma/migrations/20260918120000_enterprise_authorization_foundation/migration.sql",
      import.meta.url,
    ),
    "utf8",
  )

  for (const permission of PERMISSION_KEYS) {
    assert.match(migration, new RegExp(`'${permission.replace(".", "\\.")}'`))
  }

  for (const role of SYSTEM_ROLE_KEYS) {
    assert.match(migration, new RegExp(`'${role}'`))
  }
})
