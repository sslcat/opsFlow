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

- OpenAI (planned)

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
        documents/
        upload/
        process-invoice/
        orders/
        invoices/
        exceptions/

lib/

    auth.ts
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

Every Route Handler verifies the Clerk session before reading request data,
accessing files, or querying Prisma.

Uploaded PDFs are stored outside `public/` and can only be accessed through
authenticated processing routes.

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

All database access uses Prisma.

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

Future versions will introduce:

Authentication

↓

Organizations

↓

Role-Based Access Control

↓

AI Invoice Extraction

↓

Goods Receipt Processing

↓

3-Way Matching

↓

Workflow Engine

↓

Analytics Engine
