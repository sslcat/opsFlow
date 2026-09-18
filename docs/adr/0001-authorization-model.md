# ADR-0001: Authorization Model

## Status

Accepted

---

## Date

2026-09-18

---

# Context

OpsFlow is evolving from a single-user MVP into a multi-tenant SaaS platform.

Authentication has been completed using Clerk.

The next architectural challenge is authorization.

The system must support:

- Multiple organizations
- Multiple users per organization
- Business roles
- Fine-grained permissions
- Future Goods Receipt processing
- AI workflows
- Audit history

The existing implementation authenticates users but does not isolate business data.

Every authenticated user can currently access all records.

---

# Decision

OpsFlow will adopt a hybrid authorization architecture.

Clerk is responsible for:

- Authentication
- User identity
- Organization identity
- Organization membership

OpsFlow is responsible for:

- Business roles
- Permissions
- Workflow authorization
- Business ownership
- Audit history

Every business entity will belong to exactly one organization.

Every query will be scoped by organization.

Authorization decisions will be enforced on the server.

---

# Rationale

This approach separates identity management from business authorization.

Advantages:

- Works with Clerk Organizations
- Supports future custom business roles
- Supports AI workflows
- Supports approval workflows
- Supports audit history
- Supports multi-tenancy
- Keeps business rules inside OpsFlow

---

# Consequences

Positive

- Clean separation of responsibilities
- Enterprise-ready authorization model
- Flexible permissions
- Scalable architecture

Negative

- Requires additional Prisma models
- Requires tenant-aware queries
- Requires migration of existing data

---

# Future Work

Sprint 2B will implement:

- Organization ownership
- Membership model
- Roles
- Permissions
- Authorization context
- Tenant-scoped queries

Sprint 2C will migrate existing business entities to tenant ownership.