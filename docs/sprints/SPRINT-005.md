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

## Product experience follow-up

- Introduced a responsive workspace shell, active navigation, shared page headers,
  cards, badges, accessible table containers, empty states, loading skeletons,
  and a recoverable page error state. Clerk's complete `UserButton` now sits in
  the top-right header. No Clerk features or development badges are hidden.
- Rebuilt the dashboard around invoice/document counts, open and resolved
  exceptions, a pending review queue, seven-day invoice activity (UTC), and
  recent recorded invoices and exceptions. It reuses existing tenant-scoped
  readers; invoice data is read only with the existing `invoice.read` permission.
  These are descriptive statistics, not payment approval or inferred match rates.
- The dashboard labels its record-based operational summary accurately. Sprint 5
  does not persist AI advice, so genuine AI summaries remain in the upload result.
  No new AI requests, advice persistence, or backend summary service were added.
- Upload supports keyboard file selection and drag-and-drop, PDF/size feedback,
  real transfer progress, processing feedback, successful invoice details,
  extraction confidence/warnings, and prominent advisory AI explanations.
  Extraction, matching, and Insights share one synchronous response; the UI shows
  a combined pending state rather than inventing intermediate completion events.
  Regex fallback and unavailable/not-generated Insights remain explicit.
- Processing retries retain the uploaded document ID and use the existing
  idempotent endpoint. Exception resolution now reports pending and failed
  requests without changing its request payload or business behavior.
- Backend routes, APIs, authentication, authorization policies, tenant data
  functions, extraction/Insights services, matching rules, schema, and
  dependencies are unchanged.

### Follow-up verification

- TypeScript, ESLint, production build, and diff whitespace checks passed.
- Existing tests: 34 passed; 3 disposable-database tests skipped because the
  required test database is not configured. No migration was applied.
- Headless Edge reviewed the actual UI components using synthetic records and
  mocked service boundaries, without adding any application auth bypass.
  52 browser checks passed across 1440, 1024, 768, and 390 pixel widths, empty
  states, restricted invoice statistics, drag-and-drop, invalid files, upload
  progress, processing/completion, error recovery, retry without re-upload,
  available/unavailable/not-generated Insights, and exception resolution feedback.
  Four final checks covered the settings empty state, AI panel placement, and
  completed-upload overflow at tablet and mobile widths.
- Screenshots of dashboard, upload, invoices, orders, exceptions, settings,
  loading, and error views were reviewed. Narrow-screen card overflow was fixed;
  data tables scroll within labeled keyboard-focusable containers.
- Authenticated Clerk account-menu interaction, live AI calls, and live database
  workflows remain release smoke checks. The visual harness used a stand-in
  account button, not a real Clerk session. No environment keys were changed.
