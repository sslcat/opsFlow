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

---

# Future APIs

Goods Receipts

Audit Log

Comments

Vendor Analytics

Approval Workflow

AI Extraction

Notifications
