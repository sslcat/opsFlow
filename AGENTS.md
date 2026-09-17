# OpsFlow

## Project Vision

OpsFlow is an AI-powered Accounts Payable Operations Platform.

The purpose of the application is to help finance and operations teams automatically process invoices, compare them against Purchase Orders, detect discrepancies, and manage the exception resolution workflow before invoices are approved for payment.

The long-term goal is to build an enterprise-grade SaaS application suitable for real manufacturing, logistics, distribution, and procurement organizations.

---

# Product Goals

The application should eventually support:

- Purchase Orders
- Goods Receipts
- Invoice Processing
- 2-Way Matching
- 3-Way Matching
- Exception Management
- Approval Workflow
- AI-powered Document Extraction
- Dashboard Analytics
- Audit Trail
- Multi-Tenant Organizations
- Role-Based Access Control

---

# Current Architecture

## Frontend

- Next.js 16 App Router
- React
- TypeScript
- Tailwind CSS

## Backend

- Next.js Route Handlers
- TypeScript

## Database

- PostgreSQL (Neon)

## ORM

- Prisma

## Authentication

- Clerk (currently being integrated)

---

# Current Features

Implemented:

- Dashboard
- Orders
- Invoices
- Upload
- Exceptions
- Resolve Exception
- Purchase Order API
- Invoice API
- Exception API
- File Upload
- PDF Extraction
- Invoice Parsing
- Purchase Order Matching
- Automatic Price Mismatch Detection
- Automatic Exception Creation
- Exception Resolution

---

# Business Workflow

Current workflow:

Purchase Order
↓

Invoice Upload

↓

PDF Extraction

↓

Invoice Parsing

↓

Purchase Order Matching

↓

Business Rule Validation

↓

Exception Creation

↓

Exception Resolution

Future workflow:

Purchase Order

↓

Goods Receipt

↓

Invoice

↓

3-Way Matching

↓

Approval Workflow

---

# Coding Standards

Always:

- Preserve existing working functionality.
- Prefer extending existing architecture over rewriting it.
- Keep components modular.
- Keep API routes focused on one responsibility.
- Keep business logic separate from UI.
- Use TypeScript everywhere.
- Use Prisma for all database access.
- Prefer server components unless client components are required.
- Keep styling in Tailwind.
- Use descriptive names.
- Add error handling.
- Avoid introducing unnecessary dependencies.

Never:

- Rewrite working files unnecessarily.
- Break API contracts.
- Remove existing functionality without discussion.
- Introduce duplicate code.
- Hardcode secrets.
- Commit `.env` files.
- Change the Prisma schema without providing a migration.

---

# Git Workflow

Each feature should be its own commit.

Preferred workflow:

Feature

↓

Implementation

↓

Testing

↓

Commit

↓

Push

Avoid combining unrelated changes into one commit.

---

# Development Process

Before implementing new features:

1. Understand the existing implementation.
2. Reuse existing code when possible.
3. Explain architectural impact.
4. Implement.
5. Test.
6. Commit.

Do not make large architectural changes without explaining why.

---

# Testing Expectations

Whenever modifying functionality:

- Verify routes still work.
- Verify Prisma queries still work.
- Verify dashboard loads.
- Verify upload flow.
- Verify invoice processing.
- Verify exception workflow.

---

# Long-Term Roadmap

## Phase 1

Authentication

Organizations

Permissions

Deployment

---

## Phase 2

Dashboard improvements

Analytics

Search

Filtering

Pagination

---

## Phase 3

AI Invoice Extraction

Replace regex extraction with LLM extraction while preserving regex as fallback.

---

## Phase 4

Goods Receipt

3-Way Matching

Approval Workflow

---

## Phase 5

Vendor Analytics

Fraud Detection

Duplicate Invoice Detection

Payment Risk Scoring

Executive Dashboard

---

# AI Expectations

When implementing AI:

Prefer OpenAI structured outputs.

Return strongly typed JSON.

Do not rely on brittle regex when AI can infer document structure.

Always validate AI output before database writes.

---

# Deployment

Target deployment:

Frontend:
Vercel

Database:
Neon PostgreSQL

Authentication:
Clerk

Source Control:
GitHub

---

# Engineering Philosophy

OpsFlow should be treated as a real SaaS product.

Code should prioritize:

- maintainability
- readability
- modularity
- correctness
- business value

over cleverness.