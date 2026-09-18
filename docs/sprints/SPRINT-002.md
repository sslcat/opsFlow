# Sprint 2 – Enterprise Foundation

## Status

Implemented

---

# Goal

Introduce tenant-aware authorization and business ownership while preserving all existing functionality.

This sprint establishes the security foundation required for a production SaaS application.

---

# Business Value

Authentication identifies users.

Authorization determines what those users are allowed to access.

OpsFlow must guarantee that one organization can never access another organization's financial data.

---

# Scope

Included:

- Organization ownership
- Organization membership
- Business roles
- Permissions
- Authorization context
- Tenant-aware queries

Not included:

- AI
- Goods Receipts
- Deployment
- Analytics
- Approval Workflow

---

# Acceptance Criteria

Users belong to organizations.

Every business entity belongs to exactly one organization.

Every protected query is organization-scoped.

Authorization context is centralized.

Existing invoice processing continues to work.

Existing exception workflow continues to work.

TypeScript passes.

ESLint passes.

Prisma validation passes.

Build succeeds.

---

# Definition of Done

Anonymous users cannot access protected resources.

Authenticated users only see their own organization's data.

Cross-tenant access is impossible through supported APIs.

All existing functionality remains operational.

---

# Risks

Database migration complexity.

Legacy data ownership.

Authorization regressions.

Permission model design.

---

# Deliverables

Updated Prisma schema.

Migration.

Authorization context.

Tenant-aware queries.

Updated documentation.

Tests.

Git commit.

Pull request.

---

# Implementation Notes

- Clerk user and active organization identifiers are mapped to internal User,
  Organization, and OrganizationMembership records by the centralized server
  authorization context.
- OpsFlow owns six system roles, the ADR-0003 permission keys, additive grants,
  and server-side permission enforcement.
- Request-synchronized memberships always start as Auditor. The first
  Organization Administrator is explicitly provisioned by an operator and the
  decision is recorded in the authorization audit log.
- Authorized administrators can assign one primary business role through the
  tenant-scoped Settings workflow, which prevents removal of the last
  administrator.
- Existing business data is assigned to the explicitly named `OpsFlow Legacy
  Data` organization by an expand-backfill-enforce migration, then transferred
  only by an explicit, audited operator claim for a selected tenant.
- Documents, Orders, Invoices, and Exceptions have mandatory ownership and all
  supported queries are scoped to the active organization.
- Invoice processing resolves a tenant-owned Document ID and preserves PDF
  extraction, matching, exception creation, and document status updates.
- Two-organization integration tests cover authorization failures, tenant-
  scoped reads and mutations, cross-tenant identifiers, page data, storage
  ownership, concurrent membership synchronization, and role safeguards.
