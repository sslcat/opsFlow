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

### Workspace navigation regression fix

The reported pattern (five sidebar pages showing 404 while Upload renders) was
caused by the existing `requirePagePermission` UI behavior: missing active Clerk
organization or business permissions triggered `notFound()`. All route files and
links existed. Upload is a client page protected by the layout; its operations
check permissions at the API boundary, so it did not hit the page-level 404.

The five data pages now reuse the unchanged `authorizeApiRequest` decision through
a small presentation helper. Anonymous access still redirects to sign-in. Denied
page access renders an organization/access recovery state, before any business
data query. The existing header includes Clerk's OrganizationSwitcher and keeps
the requested pathname when selecting, creating, or leaving an organization.
The approved data-page UI, backend, permission policy, business logic, and API
response contracts are unchanged. The full UserButton remains available.

Regression verification includes five new integration tests and 51 real Next.js
production-fixture browser/HTTP checks. Every sidebar destination renders with
authorized test data; missing-organization and denied-permission sessions render
the access state on data pages without returning a route 404 or reading business
data. Anonymous redirects and true unknown-route 404s remain intact. Desktop and
tablet navigation, active links, same-path organization selection, and switching
between test tenants pass. See `tests/browser/README.md` for repeatable checks and
the external-service fixture boundary. Live Clerk UI/session verification remains
a deployment smoke check; no live accounts or financial records were changed.

Final gates: TypeScript, ESLint, production build, Prisma schema validation, and
diff whitespace checks pass. `npm test`: 39 passed, 3 disposable-database tests
skipped (not configured). Prisma validation used placeholder URLs without a
database connection. The fix is committed locally without pushing.

### Purchase order creation follow-up

The read-only Purchase Orders page prevented users from establishing the reference
terms needed for invoice matching. It now offers a Create purchase order dialog
to memberships with `order.create`, while retaining the page's `order.read` guard.
The form reuses `POST /api/orders`, the existing Order fields and validation rules,
and the approved page header/button styles. No API, backend, schema, authorization
policy, extraction, matching, or Insights implementation changed.

The native dialog provides labeled inputs, keyboard focus handling, validation,
pending controls, duplicate feedback for loaded records, success confirmation,
and a refreshed table. Errors retain the draft and provide a list refresh action
for uncertain save outcomes; no automatic mutation retries are made. Form state
is keyed by membership and organization. Exact fields are documented in `API.md`.

Verification: TypeScript, ESLint, production build, Prisma validation (placeholder
URLs, no database connection), and diff checks pass. `npm test`: 41 passed,
3 disposable-database checks skipped because no test database is configured.
The real Next.js fixture passes 70 browser/HTTP checks, including all six sidebar
destinations, PO creation, required/optional fields, zero price, pending controls,
errors, permission loss, duplicate feedback, refresh, and tenant isolation.
Desktop/tablet dialog, error, and success screenshots were reviewed.

A controlled PO (`PO-LOCAL-E2E-1001`, Acme Supplies, ITEM-ABC, quantity 100,
unit price 10, expected date 2026-10-01) was created through the actual UI/API
against temporary in-memory fixture storage only. No production demonstration
data was created. Live Clerk and database end-to-end testing remains a separate
smoke check; the fixture does not establish a persistent PO for a real invoice.
