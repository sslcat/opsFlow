# Workspace route regression checks

Run `node tests/browser/workspace-routes.mjs` from the repository root after
installing dependencies. Requires the project's modern Node test runtime and
a Chromium browser. Edge/Chrome on Windows and Chromium/Chrome on Linux are
detected automatically; set `BROWSER_PATH` for another executable location.

The runner copies `src/` into an isolated temporary Next.js application. It
replaces only Clerk identity/UI and Prisma I/O using webpack aliases in that
temporary app, then builds and starts Next.js in production mode. It never
copies `.env` files, forwards application credentials, changes live memberships,
or adds a test bypass to the real application. The real authorization resolver,
permission checks, page components, layout, Next links, and router are exercised.
Fixtures throw if business data is read before access is granted or without the
active tenant predicate.

Checks cover all six sidebar destinations with authorized, missing-organization,
and denied-permission sessions: direct HTTP/page loads, client navigation, active
links, organization selection and switching, tablet overflow, anonymous sign-in
redirects, and an actual unknown route. Screenshots, a check count, and Next.js
logs are retained in the printed temporary directory. The app and hidden browser
are stopped after the run. The fixture's account/organization buttons are test
stand-ins; this does not claim verification of Clerk's hosted UI or real sessions.

Purchase-order checks also exercise the real form and `/api/orders` route with
read-only and create-permission memberships. They cover an empty list, dialog
keyboard/focus behavior, required/numeric validation, duplicate feedback,
permission loss, non-JSON server errors, network interruption, pending controls,
successful refresh, optional fields, zero price, and isolation of created orders
from a second tenant. Created orders exist only in the temporary server's memory;
no production or local development database is written. Screenshots include the
desktop/tablet dialog, error, and success states.

Error-focus checks cover native required/numeric validation, duplicate PO numbers,
expired sessions, lost permissions, server validation/storage failures, malformed
or mismatched success responses, and network failures. Immediate repeated failures
verify that identical messages regain focus after each submission, even when React
batches the pending and error updates.

`upload-identity-checks.mjs` adds 16 checks against the actual upload workflow.
The Clerk fixture publishes reactive user/organization changes without navigating
or refreshing the server. Completed invoice, extraction, and Insights results,
selected files, progress, pending requests, errors, and retry references must be
discarded. Tests switch back to the original organization, change users within
an organization, and remove the organization, user, or loaded auth state.
Transport fixtures deliberately deliver late XHR load/progress events, fetch
responses, JSON bodies, and errors after cancellation. They verify that old
uploads cannot start processing, old requests cannot overwrite/unlock new work,
and a retry reuses its document only while the identity remains unchanged.
No real files are uploaded and no AI provider is called by these checks.

`npm test` separately exercises the real access resolver with mocked identity
boundaries and verifies unchanged API 401/403 decisions, complete permission
requirements, tenant switching, and error propagation. Existing route tests
continue to cover processing, extraction, Insights, and cross-tenant operations.
