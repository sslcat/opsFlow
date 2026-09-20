# API Reference

## Overview

OpsFlow exposes REST APIs using Next.js Route Handlers.

The APIs are organized around business entities rather than technical implementation.

All endpoints return JSON.

All endpoints require an authenticated Clerk user, an active Clerk organization,
an internal OpsFlow membership, and the operation's business permission.

The active organization is resolved server-side. Tenant identity is never read
from request bodies or query parameters. Anonymous requests receive `401`,
missing organization/membership/permission receives `403`, and a resource that
does not exist in the active tenant receives `404`.

---

# Organizations

## GET /api/organizations

Purpose

Returns the active organization only.

---

# Memberships and Business Roles

## GET /api/memberships

Returns memberships and available system roles for the active organization.
Requires both `membership.read` and `role.read`.

---

## PUT /api/memberships/{id}/role

Assigns one primary OpsFlow business role to a membership in the active
organization. Requires both `membership.manage` and `role.manage`.

```json
{
  "roleKey": "ap_manager"
}
```

Membership IDs from another tenant return `404`. Reassigning the last
Organization Administrator returns `409`.

---

## POST /api/organizations

Purpose

Updates the active organization's OpsFlow display name. Clerk remains the source
of organization identity and membership.

Current payload

```json
{
  "name": "OpsFlow Internal Team"
}
```

---

# Documents

## GET /api/documents

Returns uploaded document records.

---

## POST /api/documents

Creates tenant-owned document metadata.

Current payload

```json
{
  "fileName": "invoice.pdf",
  "type": "INVOICE"
}
```

---

# Orders

## GET /api/orders

Returns Purchase Orders owned by the active organization.

---

## POST /api/orders

Creates Purchase Orders owned by the active organization. Purchase Order numbers
are unique within an organization.

Requires `order.create`. The Purchase Orders page (`/orders`, requiring
`order.read`) exposes **Create purchase order** only when the current membership
has `order.create`. The dialog calls this existing endpoint and refreshes the
tenant-scoped list after success; it never accepts an organization ID.

| Field | Required | Current constraints |
| --- | --- | --- |
| `poNumber` | Yes | Nonblank text, trimmed; unique within the organization |
| `quantity` | Yes | Positive whole number; the UI respects the Prisma/PostgreSQL Int maximum of 2,147,483,647 |
| `unitPrice` | Yes | Finite number greater than or equal to zero; fractional precision is not limited to two decimals |
| `vendorName` | No | Text; blank UI input becomes null |
| `itemCode` | No | Text; blank UI input becomes null |
| `expectedDate` | No | Valid date; the UI sends YYYY-MM-DD, stored at UTC midnight; blank becomes null |

Each order currently represents one item. There are no currency, tax, total,
status, or multiple-line inputs in this model. Matching uses the PO number in
the active organization and compares quantity and unit price. Vendor, item code,
and expected date do not add matching rules.

The UI catches duplicate numbers already present in the loaded list. Concurrent
duplicates remain protected by the database constraint. The unchanged endpoint
does not currently map that constraint failure to a structured conflict response;
the dialog handles non-JSON/server failures with a safe message and a **Check
purchase orders** action. It retains the draft and never retries automatically.

Current payload

```json
{
  "poNumber": "PO-1001",
  "vendorName": "Acme Supplies",
  "itemCode": "ITEM-ABC",
  "quantity": 100,
  "unitPrice": 10
}
```

---

# Invoices

## GET /api/invoices

Returns invoices owned by the active organization.

---

## POST /api/invoices

Creates invoice records.

Business behavior

Automatically compares against Purchase Orders in the active organization.

Automatically creates exceptions when mismatches exist.

Invoice creation and automatic Exception creation are committed atomically.

---

# Exceptions

## GET /api/exceptions

Returns exception records owned by the active organization.

---

## POST /api/exceptions

Creates exception records.

Normally invoked automatically by business logic.

---

## PATCH /api/exceptions/{id}

Updates exception status.

Current statuses

- OPEN
- RESOLVED

Future

- IN_REVIEW
- APPROVED
- REJECTED

---

# Upload

## POST /api/upload

Uploads invoice PDFs.

Validation

- PDF signature and media type
- Non-empty payload
- Maximum size of 4 MB
- Valid document type

Workflow

Receive PDF

↓

Store the PDF under an organization-scoped opaque storage key

↓

Create document record

↓

Return document metadata, including the Document ID used for processing

---

# Process Invoice

## POST /api/process-invoice

Purpose

Processes uploaded invoice.

Current payload

```json
{
  "documentId": "document-id-returned-by-upload"
}
```

The Document is resolved inside the active organization. Caller-provided file
paths or filenames are not accepted.

Workflow

PDF

↓

Text Extraction

↓

Invoice Parsing

↓

Invoice Creation

↓

Purchase Order Matching

↓

Exception Creation

Repeating this request for the same Document returns the existing Invoice and
does not create duplicate Invoices or Exceptions.

Extraction now uses OpenAI structured output when `OPENAI_API_KEY` is configured,
with deterministic regex fallback. Successful new processing preserves `parsed`,
`invoice`, and `idempotent` and adds `extraction` (normalized invoice, provider
attempts, warnings, and errors). Existing-invoice retries return the existing
response without another extraction call.

Unusable output, unreadable PDFs, unsupported multiple lines, or invalid business
values return `400 BAD_REQUEST`, record the failure, and set the Document to
`FAILED` without creating an Invoice or Exception. A failed document can be retried.
Concurrent successful processing is never downgraded by a failed extraction.

Successful processing adds `insights` without changing the existing fields:

```json
{
  "status": "AVAILABLE",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "insights": {
    "summary": "The invoice quantity differs from the purchase order.",
    "observations": ["The invoice lists 12 units; the PO lists 10."],
    "recommendations": ["Verify the invoiced quantity with procurement."],
    "confidence": 0.9
  }
}
```

The advisory service runs only after a newly created invoice commits. It receives
the normalized invoice, the tenant-scoped PO quantity/price snapshot, the actual
matching result, and validation warnings. It cannot approve, resolve, or update
business records. Missing configuration or provider failure returns
`{ "status": "UNAVAILABLE", "insights": null }` with the successful processing
response. Already-processed invoices (including concurrent retries) return
`{ "status": "NOT_GENERATED", "insights": null }` without an insights call.
Insights are not persisted or regenerated on retry. Failed validation never
invokes the service. The upload page displays the advice and its availability.

`POST /api/parse` accepts `{ "text": "invoice text" }` and uses the same engine,
preserving successful legacy parsed-field responses. Invalid extraction now
returns `400` instead of a partial result. This text-only preview creates no
Document, Invoice, or persistent audit. `POST /api/extract` remains a text-only PDF
utility. Text input is limited to 100,000 characters by the engine.

---

# Future APIs

Goods Receipts

Audit Log

Comments

Vendor Analytics

Approval Workflow

AI Extraction

Notifications
