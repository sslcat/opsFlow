export const PERMISSION_KEYS = [
  "organization.read",
  "organization.manage",
  "membership.read",
  "membership.manage",
  "role.read",
  "role.manage",
  "order.read",
  "order.create",
  "order.update",
  "document.read",
  "document.upload",
  "document.process",
  "invoice.read",
  "invoice.create",
  "invoice.update",
  "invoice.process",
  "exception.read",
  "exception.triage",
  "exception.assign",
  "exception.resolve",
  "audit.read",
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const SYSTEM_ROLE_KEYS = [
  "organization_administrator",
  "controller",
  "ap_manager",
  "ap_specialist",
  "procurement",
  "auditor",
] as const

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number]

const permissionKeySet = new Set<string>(PERMISSION_KEYS)

export function isPermissionKey(value: string): value is PermissionKey {
  return permissionKeySet.has(value)
}

export function collectEffectivePermissions(permissionKeys: Iterable<string>) {
  const effectivePermissions = new Set<PermissionKey>()

  for (const permissionKey of permissionKeys) {
    if (isPermissionKey(permissionKey)) {
      effectivePermissions.add(permissionKey)
    }
  }

  return effectivePermissions
}

export function hasEveryPermission(
  effectivePermissions: ReadonlySet<PermissionKey>,
  requiredPermissions: readonly PermissionKey[],
) {
  return requiredPermissions.every((permission) =>
    effectivePermissions.has(permission)
  )
}
