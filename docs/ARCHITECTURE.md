# Architecture

## Overview

OpsFlow is a modern full-stack SaaS application built using a server-first architecture.

The application combines a React-based frontend, server-side business logic, a relational PostgreSQL database, and document processing capabilities into a single Next.js application.

---

# High-Level Architecture

```text
                Browser
                   │
                   ▼
             Next.js 16
        (React + App Router)
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
 Server Components      Client Components
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
           Route Handlers (API)
                   │
                   ▼
                Prisma ORM
                   │
                   ▼
          Neon PostgreSQL Database
```

---

# Technology Stack

## Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS

## Backend

- Next.js Route Handlers
- TypeScript

## ORM

- Prisma

## Database

- Neon PostgreSQL

## Authentication

- Clerk
- Server-side page protection
- Authenticated API route handlers

## AI

- OpenAI structured outputs through the provider-independent Extraction Engine

---

# Application Structure

```
src/

app/
    sign-in/
    sign-up/

    (dashboard)/
        layout.tsx

        dashboard/
        upload/
        orders/
        invoices/
        exceptions/
        settings/

    api/

        organizations/
        memberships/
        documents/
        upload/
        process-invoice/
        orders/
        invoices/
        exceptions/

lib/

    auth.ts
    authorization.ts
    authorization-policy.ts
    prisma.ts
    uploads.ts

proxy.ts

prisma/

docs/
```

---

# Frontend Architecture

The frontend uses the Next.js App Router.

Pages are grouped inside the `(dashboard)` route group.

Shared UI is implemented using layouts.

The dashboard layout requires a Clerk session before rendering financial data.
The sign-in and sign-up routes remain public.

Example:

Dashboard Layout

↓

Sidebar

↓

Current Page

↓

Dashboard

Orders

Invoices

Upload

Exceptions

---

# Backend Architecture

Business logic is implemented using Next.js Route Handlers.

Every Route Handler resolves a centralized authorization context before reading
request data, accessing files, or querying Prisma. The context maps the Clerk
user and active Clerk organization to internal User, Organization, Membership,
and effective additive permissions.

Clerk owns authentication and identity-provider membership. OpsFlow owns
business roles, permission grants, business ownership, and enforcement.

New synchronized memberships always receive the Auditor role. Initial
administrator provisioning is an explicit operator action, while later primary
business-role assignments are performed through tenant-scoped, permission-
protected application operations with a last-administrator safeguard. These
authorization changes are recorded in `AuthorizationAuditEvent`.

Uploaded PDFs are stored outside `public/` under organization-scoped opaque
storage keys. Deployed environments use a private Vercel Blob store; local
development retains private filesystem storage. Processing routes accept an
authorized Document ID and never a client-controlled storage path.

Invoice creation, Purchase Order matching, Exception creation, and source
Document status updates share a transaction. Each uploaded source Document can
produce at most one Invoice, so client or platform retries are idempotent.

Example:

POST /api/upload

↓

Upload PDF

↓

Store file

↓

Create document record

↓

Return metadata

---

POST /api/process-invoice

↓

Extract PDF text

↓

Parse invoice

↓

Create invoice

↓

Compare Purchase Order

↓

Create exceptions

---

# Database Layer

All database access uses Prisma. Document, Order, Invoice, and Exception records
have mandatory internal `organizationId` ownership. Every supported business
read, create, update, and relationship lookup is scoped to the active internal
organization.

No raw SQL should be written unless there is a measurable performance benefit.

The database is hosted in Neon PostgreSQL.

---

# Design Principles

The application follows:

- Server-first rendering
- Modular architecture
- Separation of concerns
- Business logic separated from UI
- Database access isolated through Prisma
- Shared layouts
- Type-safe APIs

---

# Future Architecture

ADR-0005 is implemented in `src/lib/insights/`, separately from extraction.
The invoice matching service exposes the PO snapshot and deterministic outcomes
used to create exceptions while preserving its existing invoice-only entry point.
After the transaction commits, the processing route passes those facts and the
validated normalized invoice to a provider-independent insights service.

OpenAI returns structured advisory text, validated at runtime before display.
The service has no database or workflow mutation capability. Provider failures
return an unavailable result without affecting processing. It runs once for a
newly processed invoice, outside transaction retries; existing invoices skip it.
No insights history or new tables are introduced. The upload page renders plain
text advice with an advisory label and self-assessed explanation confidence.
Matching still checks only PO existence, quantity, and unit price.

ADR-0004 is implemented in `src/lib/extraction/`. Both invoice processing and
text parsing enter the engine. Providers receive the document, extracted text,
and metadata; OpenAI currently uses text only. Regex is the deterministic fallback.
All provider output passes runtime field validation and deterministic business
validation before reaching the existing matching service. Business-rule failures
stop processing rather than retrying through a less capable provider.

Each document extraction creates a tenant-owned `ExtractionRun` containing the
normalized result, attempts, provider/model/timestamp/confidence, warnings, and
validation errors. Audit creation and the document/invoice state transition are
atomic. Existing invoice idempotency and authorization rules remain enforced.
Future providers are registered only inside the engine.

The current matching model supports one line with an integer quantity. Multiple
lines are represented by the extraction contract but rejected before invoice
creation until the matching and storage model supports them. Scanned PDFs without
text fail explicitly; OCR and image input are not implemented in this sprint.

Future versions will introduce:

AI Invoice Extraction

↓

Goods Receipt Processing

↓

3-Way Matching

↓

Workflow Engine

↓

Analytics Engine
