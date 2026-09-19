# Sprint 4 – AI Extraction Engine

## Status

Implemented locally; deployment and live service verification pending.

---

# Goal

Introduce a provider-based AI Extraction Engine while preserving deterministic invoice extraction.

The application should no longer depend directly on a specific extraction implementation.

---

# Business Value

Support invoices from arbitrary vendors while maintaining deterministic validation and business rules.

AI improves extraction.

Business logic remains deterministic.

---

# Scope

Included

- Extraction Engine
- Provider interface
- OpenAI Provider
- Regex Provider
- Common normalized invoice model
- Confidence score
- Validation pipeline

Not Included

- Goods Receipts
- Analytics
- Audit Timeline
- Approval Workflow

---

# Acceptance Criteria

Application uses Extraction Engine.

OpenAI provider works.

Regex provider remains available.

Existing invoice processing continues working.

Business validation remains deterministic.

No changes required outside Extraction Engine when adding future providers.

TypeScript passes.

ESLint passes.

Build succeeds.

---

# Definition of Done

Uploading an invoice uses the Extraction Engine.

OpenAI extraction succeeds.

If AI fails, Regex Provider is used.

Existing workflow remains operational.

---

# Deliverables

Extraction Engine

Provider interface

OpenAI provider

Regex provider

Deployment

## Implementation notes

- Added the provider interface, normalized invoice model, runtime validation,
  OpenAI structured outputs, and deterministic regex fallback.
- Upload processing and text parsing use the engine; existing matching,
  permissions, tenant isolation, and invoice idempotency remain in place.
- Added the additive `ExtractionRun` migration for tenant-owned extraction history.
- Multiple lines are extracted but rejected before invoice creation because the
  existing matching/storage model supports one line. Image-only PDFs require a
  future OCR provider. No line is intentionally discarded to fit the old model.
- Tests cover provider responses, fallback, failure, deterministic validation,
  route persistence, matching, and authorization. Live OpenAI, database migration,
  authenticated browser smoke tests, and production deployment remain release gates.

## Local verification

- `npm test`: 29 passed; 3 disposable-database tests skipped (not configured).
- `npm run typecheck`, `npm run lint`, and `npm run build`: passed.
- `prisma validate`: passed using placeholder database URLs (no connection).
- No migration was applied. `OPENAI_API_KEY`, `DIRECT_URL`, and
  `TEST_DATABASE_URL` are not configured locally. OpenAI behavior is covered with
  mocked HTTP responses; a live successful extraction is not yet verified.

## PR review fixes

- Regex reads complete numeric tokens in both known layouts, supports correctly
  grouped thousands separators, and rejects malformed tokens. Fractional quantities
  reach the existing integer business rule and fail rather than being truncated.
- Repeated quantity/price labels, incomplete labelled lines, and mixed table/label
  layouts fail extraction rather than silently dropping a line.
- A supplied invoice total must reconcile even when tax is absent. With null tax,
  the total must equal the subtotal (or line sum when subtotal is absent), using
  the existing rounding tolerance. Tax remains null; unexplained differences fail
  business validation without regex fallback. An absent total remains optional.
- Added engine regressions and route checks for failed-document auditing without
  invoice or exception creation. Architecture, API shapes, and schema are unchanged.
