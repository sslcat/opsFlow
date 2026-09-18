# ADR-0002: Multi-Tenant Data Ownership

## Status

Accepted

## Date

2026-09-18

## Context

OpsFlow is moving from a shared MVP database into a multi-tenant SaaS platform.

Currently, Purchase Orders, Invoices, Documents, and Exceptions are global records with no tenant ownership.

This means authentication alone cannot prevent one customer from accessing another customer's financial data.

## Decision

Organization will be the root tenant boundary in OpsFlow.

Every business record must belong to exactly one Organization.

Tenant-owned entities include:

- Documents
- Purchase Orders
- Invoices
- Exceptions
- Future Goods Receipts
- Future Vendors
- Audit Events
- Approval Records
- AI Processing Jobs

Each tenant-owned record will contain an internal `organizationId`.

The internal OpsFlow Organization ID will be used for database relationships.

Clerk Organization IDs will only be used as external identity mappings.

## Data Access Rules

Every read, create, update, and delete operation must be scoped to the active organization.

The organization must come from the authenticated server-side authorization context.

It must never be trusted from:

- request bodies
- query parameters
- client-controlled form fields

A resource belonging to another organization should generally be treated as not found.

## Cross-Tenant Relationships

A business entity may only reference another business entity within the same organization.

Examples:

- An Invoice in Organization A cannot reference an Order in Organization B.
- An Exception in Organization A cannot reference an Invoice in Organization B.
- A future Goods Receipt must reference a Purchase Order owned by the same organization.

## Existing Data Migration

The current database contains MVP/test records with no tenant ownership.

Migration will use an expand-backfill-enforce strategy.

1. Add nullable organization ownership fields.
2. Create an explicitly named legacy organization.
3. Assign existing MVP records to that organization.
4. Update all application access paths to use tenant-scoped queries.
5. Verify tenant isolation with tests.
6. Make organization ownership mandatory.
7. Add tenant-aware indexes and uniqueness constraints.

Existing ownership must never be inferred silently from business data.

## Storage

Uploaded documents must eventually use organization-scoped opaque storage keys.

Document processing should operate on an authorized Document ID rather than a caller-provided filename.

## Defense in Depth

Initial tenant isolation will be enforced by application logic and organization-scoped Prisma queries.

PostgreSQL Row-Level Security may be introduced later as a second line of defense after application-level tenancy is stable.

## Consequences

### Positive

- Strong customer data isolation
- Clear ownership model
- Supports future enterprise workflows
- Supports tenant-specific analytics
- Enables safe AI and Goods Receipt processing

### Negative

- Existing data requires migration
- Every business query becomes tenant-aware
- More complex database constraints and indexes
- Cross-tenant isolation requires comprehensive testing

## Future Work

Sprint 2B will establish identity, membership, roles, permissions, and authorization context.

Sprint 2C will apply organization ownership to existing business entities and enforce tenant-scoped access throughout the application.