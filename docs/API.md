# API Reference

## Overview

OpsFlow exposes REST APIs using Next.js Route Handlers.

The APIs are organized around business entities rather than technical implementation.

All endpoints return JSON.

All endpoints require an authenticated Clerk user. Anonymous requests receive a
`401 Unauthorized` response before business logic runs.

---

# Organizations

## GET /api/organizations

Purpose

Returns all organizations.

---

## POST /api/organizations

Purpose

Creates a new organization.

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

Creates document metadata.

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

Returns Purchase Orders.

---

## POST /api/orders

Creates Purchase Orders.

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

Returns invoices.

---

## POST /api/invoices

Creates invoice records.

Business behavior

Automatically compares against Purchase Orders.

Automatically creates exceptions when mismatches exist.

---

# Exceptions

## GET /api/exceptions

Returns exception records.

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

Store PDF

↓

Create document record

↓

Return document metadata

---

# Process Invoice

## POST /api/process-invoice

Purpose

Processes uploaded invoice.

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

Organizations

Goods Receipts

Audit Log

Comments

Vendor Analytics

Approval Workflow

AI Extraction

Notifications
