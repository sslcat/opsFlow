# Database Design

## Overview

OpsFlow uses PostgreSQL hosted on Neon.

Database access is performed exclusively through Prisma ORM.

The database is designed around the Accounts Payable workflow.

Core business entities include:

- Organization
- User
- Purchase Order
- Invoice
- Document
- Exception

---

# Entity Relationships

```text
Organization
     │
     ├──────────────┐
     │              │
     ▼              ▼
 Purchase Order   Invoice
     │              │
     └──────┬───────┘
            ▼
       Exception

Document
     │
     ▼
Uploaded Invoice PDF

User
     │
     ▼
Organization Membership
     │
     ▼
Business Role ──► Permission
```

---

# User

Purpose

Represents a user of the application.

Current fields

- id
- clerkUserId
- email
- fullName
- createdAt
- updatedAt

Future additions

- Last Login

---

# Organization

Purpose

Represents a company using OpsFlow.

Current fields

- id
- clerkOrganizationId
- name
- createdAt
- updatedAt

Future additions

- Address
- Time Zone
- Subscription Plan
- Billing Information

---

# Purchase Order

Purpose

Represents purchasing agreements imported from ERP systems.

Current fields

- poNumber
- vendorName
- itemCode
- quantity
- unitPrice
- expectedDate

Business rules

- One Purchase Order may have multiple line items (future)
- Purchase Orders are considered the source of truth during invoice comparison.

---

# Invoice

Purpose

Represents vendor invoices.

Current fields

- invoiceNumber
- poNumber
- vendorName
- itemCode
- quantity
- unitPrice
- invoiceDate

Business rules

Invoices are compared against Purchase Orders.

Future versions will compare against both:

- Purchase Orders
- Goods Receipts

---

# Document

Purpose

Stores uploaded document metadata.

Current fields

- fileName
- type
- status

Current storage

- Private Vercel Blob storage in deployed environments
- Private local uploaded PDFs outside the public web root in development

`Document.storageKey` stores an organization-scoped opaque pathname rather
than a public URL. `Invoice.sourceDocumentId` links a processed invoice to its
tenant-owned source Document and makes processing retries idempotent.

Future storage

- OCR Results
- AI Extraction Results
- Original File Metadata

---

# Exception

Purpose

Represents business rule violations.

Current types

- PRICE_MISMATCH
- QUANTITY_MISMATCH
- MISSING_DOCUMENT
- DUPLICATE_INVOICE

Current statuses

- OPEN
- RESOLVED

Future statuses

- IN_REVIEW
- APPROVED
- REJECTED

Future additions

- Assigned User
- Priority
- Due Date
- Comments
- Resolution Notes

---

# Future Entities

GoodsReceipt

Purpose

Represents confirmation that physical goods were received.

Will enable:

Purchase Order

↓

Goods Receipt

↓

Invoice

↓

3-Way Matching

---

AuditLog

Purpose

Stores application history.

Example:

Invoice Uploaded

↓

Invoice Parsed

↓

Exception Created

↓

Exception Assigned

↓

Exception Resolved

---

Comment

Purpose

Supports collaboration between finance users.

Example

John:

Please verify vendor pricing.

Sarah:

Vendor confirmed corrected invoice.

---

# Database Principles

The database follows these principles:

- Normalize business data where practical.
- Preserve business history.
- Avoid duplicate data.
- Use Prisma for all database access.
- Prefer explicit relationships.
- Preserve auditability.

---

# Long-Term Vision

The database should support enterprise-scale Accounts Payable workflows while remaining simple enough to maintain.

Future releases should prioritize:

- Auditability
- Performance
- AI integration
- Reporting
- Workflow history

---

# Sprint 2 Authorization Foundation

Clerk user and organization identifiers are external identity mappings on
`User.clerkUserId` and `Organization.clerkOrganizationId`. OpsFlow uses internal
IDs for all database relationships.

`OrganizationMembership` joins one User to one Organization. Memberships may
have multiple Roles through `MembershipRole`. Roles receive additive Permissions
through `RolePermission`; explicit denies are not used.

The seeded system roles are Organization Administrator, Controller, AP Manager,
AP Specialist, Procurement, and Auditor. Every membership synchronized from an
application request defaults to Auditor, including the first membership for a
newly mapped Clerk organization. An operator explicitly provisions the initial
Organization Administrator using the audited onboarding command. Authorized
administrators assign one primary business role through the tenant-scoped
Settings workflow; the last administrator cannot be reassigned.

Document, Order, Invoice, and Exception each have a required `organizationId`.
Document also has a server-controlled `storageKey`. All supported access paths
scope these records to the active internal organization. Existing MVP records
are backfilled to the explicitly named `OpsFlow Legacy Data` organization and
are not silently assigned to a Clerk tenant. An operator-controlled claim
command transactionally transfers those records to a specifically named Clerk
tenant after checking Purchase Order uniqueness conflicts.

`AuthorizationAuditEvent` records initial administrator provisioning, business
role assignments, and legacy ownership claims with an operator/actor identifier
and operation metadata.
