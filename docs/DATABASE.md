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
Future:
Organization Membership
```

---

# User

Purpose

Represents a user of the application.

Current fields

- id
- email
- fullName
- createdAt
- updatedAt

Future additions

- Clerk User ID
- Organization Membership
- Role
- Last Login

---

# Organization

Purpose

Represents a company using OpsFlow.

Current fields

- id
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

- Uploaded PDFs

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

- Multi-tenancy
- Auditability
- Performance
- AI integration
- Reporting
- Workflow history