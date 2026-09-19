# Sprint 5 – AI Insights

## Goal

Introduce AI-generated explanations for invoice processing results.

## Status

Implemented locally; live OpenAI and authenticated browser verification pending.

## Business Value

Help AP users understand why invoices match or mismatch without manually comparing fields.

## Scope

Included

- AI Insights Service
- Summary generation
- Mismatch explanations
- Recommendation generation

Not Included

- Goods Receipts
- Audit Timeline
- Analytics

## Acceptance Criteria

AI generates summaries.

AI explains mismatches.

AI recommends next actions.

Existing workflow remains unchanged.

Extraction Engine remains unchanged.

TypeScript passes.

ESLint passes.

Build succeeds.

## Definition of Done

Users receive understandable AI explanations after invoice processing.

## Implementation

- Added a provider-independent insights service with OpenAI structured output,
  runtime validation, and an independently configurable model.
- Invoice processing supplies the normalized invoice, tenant-scoped PO snapshot,
  actual deterministic matching outcomes, and validation warnings after commit.
- The upload page shows summaries, observations, suggested actions, and
  self-assessed confidence as advisory text.
- Missing configuration and AI failures leave invoice processing successful.
  Existing-invoice retries skip generation; failed extraction never invokes AI
  insights. Advice is ephemeral and is not stored in this sprint.
- Extraction, matching rules, API fields, authorization, and schema are preserved.

## Verification

- `npm test`: 34 passed; 3 disposable-database tests skipped (not configured).
- TypeScript, ESLint, Prisma validation, production build, and diff checks pass.
  Prisma validation used placeholder URLs without connecting to a database.
  The build required a retry outside the sandbox after a worker spawn `EPERM`.
- `OPENAI_API_KEY`, `DIRECT_URL`, and `TEST_DATABASE_URL` are not configured
  locally. No live AI request or database migration was performed.

- Service/provider tests cover validated output, malformed output, refusal,
  incomplete responses, HTTP failures, timeout, and input mutation isolation.
- Route tests cover match, quantity/price mismatch, missing PO, post-transaction
  invocation, failed extraction, retries, and successful processing when AI fails.
- Live OpenAI calls, authenticated browser smoke tests, and production deployment
  remain release checks. See `docs/DEPLOYMENT.md`.
