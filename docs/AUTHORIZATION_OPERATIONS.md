# Authorization Operations

## Purpose

These commands resolve two authorization bootstrap operations that must never be
inferred from request order, Clerk roles, or business data:

- selecting the first OpsFlow Organization Administrator;
- assigning the legacy MVP records to a chosen Clerk organization.

Both commands require an operator identifier and write an
`AuthorizationAuditEvent` in the same database transaction as the change.

## Prerequisites

1. Take a database snapshot.
2. Apply the Prisma migrations, including the authorization foundation and
   authorization audit event migrations.
3. Confirm the Clerk organization ID and Clerk user ID with the business owner.
4. Record the ticket or operator identity that authorized the change.

## Provision the Initial Administrator

```powershell
npm run auth:provision-admin -- --clerk-organization-id org_example --clerk-user-id user_example --operator ticket-123 --organization-name "Example Company"
```

This command creates or reuses the internal identity mappings, assigns the
named membership the single primary `organization_administrator` business role,
and records `INITIAL_ADMINISTRATOR_PROVISIONED`.

The command is idempotent for the already-provisioned initial administrator. It
refuses to replace a different initial administrator. Later role changes must
use the tenant-scoped Settings page and are protected by `membership.manage`
and `role.manage`.

Ordinary application access creates an Auditor membership only. It never
creates an administrator, including when the organization has no memberships.

## Claim Legacy Data

Provision the initial administrator first so a typo cannot create an
unreviewed destination tenant. Then run:

```powershell
npm run auth:claim-legacy -- --clerk-organization-id org_example --operator ticket-123
```

The command verifies that the target organization exists and has no Purchase
Order number conflicts with the legacy tenant. It then transfers all legacy
Documents, Orders, Invoices, and Exceptions in one serializable transaction and
records `LEGACY_ORGANIZATION_CLAIMED` with the transferred counts. It does not
delete the explicitly named legacy organization or move/delete uploaded files.

If no legacy records remain, the command makes no database change.

## Verification

- Sign in with the provisioned administrator and select the intended Clerk
  organization.
- Confirm the Settings page identifies that member as Organization
  Administrator.
- Confirm the expected legacy record counts are visible only in that tenant.
- Confirm a user in a second organization receives `404` for a claimed record
  ID.
- Preserve the `AuthorizationAuditEvent` rows with the change record.

## Rollback

Command failures roll back automatically because the data and audit changes use
one transaction.

Before a successful legacy claim, take a database snapshot. If the claim must
be reversed after application traffic resumes, restore that snapshot during a
controlled maintenance window. Do not blindly move records back: new records
created after the claim cannot be safely distinguished from claimed records.

The claim does not move or delete document files, so no filesystem rollback is
required. Application code can be reverted independently. The additive audit
table may be dropped only after its history has been exported and preserved.
