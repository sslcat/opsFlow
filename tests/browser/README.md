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

`npm test` separately exercises the real access resolver with mocked identity
boundaries and verifies unchanged API 401/403 decisions, complete permission
requirements, tenant switching, and error propagation. Existing route tests
continue to cover processing, extraction, Insights, and cross-tenant operations.
