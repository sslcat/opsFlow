# Deployment

## Production Stack

- Vercel for the Next.js application and Route Handlers
- Neon PostgreSQL for tenant-owned business data
- Clerk for authentication and organization identity
- Private Vercel Blob for uploaded invoice PDFs

OpenAI is planned but is not required by the current regex-based extraction
workflow.

## Environment Variables

Copy `.env.example` for local development. Never commit real values.

Required application variables:

- `DATABASE_URL`: pooled Neon URL used by Prisma Client at runtime
- `DIRECT_URL`: non-pooler Neon URL used by Prisma Migrate
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `BLOB_READ_WRITE_TOKEN`: added when the private Blob store is connected

Optional variables:

- `OPENAI_API_KEY`: reserved for the future AI extraction phase
- `TEST_DATABASE_URL` and `ALLOW_DATABASE_TESTS=true`: dedicated disposable
  database for `npm run test:db`

Use the pooled Neon hostname (containing `-pooler`) for `DATABASE_URL`. Use the
corresponding direct hostname (without `-pooler`) for `DIRECT_URL`.

## Pre-Deployment Verification

Run against the exact revision being deployed:

```powershell
npm ci
npm test
npm run typecheck
npm run lint
npx prisma validate
npm run build
git diff --check
```

Run the database-backed isolation suite only against a disposable database
that already has all migrations applied:

```powershell
$env:TEST_DATABASE_URL = "postgresql://..."
$env:ALLOW_DATABASE_TESTS = "true"
npm run test:db
```

## Database Migration

Database migration is an operator action and does not run during a Vercel
build. This avoids concurrent deployments racing to modify the production
schema.

1. Confirm `DATABASE_URL` points to the intended pooled production database.
2. Confirm `DIRECT_URL` points to the same Neon database through its direct
   endpoint.
3. Confirm Neon restore history is available or take a branch before changing
   the schema. Do not export production financial data into the repository.
4. Check migration state with `npx prisma migrate status`.
5. Apply committed migrations with `npx prisma migrate deploy`.
6. Run `npx prisma migrate status` again and require a clean result.

The authorization migration assigns pre-existing MVP records to `OpsFlow
Legacy Data`. After the application is deployed, provision the approved first
administrator and claim legacy data using the audited commands in
`docs/AUTHORIZATION_OPERATIONS.md`.

## Vercel Setup

1. Import `sslcat/opsFlow` or link the local repository to a Vercel project.
2. Keep the framework preset on Next.js and the build command on `next build`.
3. Add all required environment variables to Production. Add separate values
   to Preview only when preview deployments should access isolated services.
4. Create a Vercel Blob store, set access to **Private**, and connect it to the
   project. Confirm Vercel adds `BLOB_READ_WRITE_TOKEN`.
5. Deploy a preview and complete the smoke tests below.
6. Deploy or promote the verified revision to Production.
7. Add the production domain to Clerk's allowed origins and redirect URLs.

Do not use public Blob access for invoice documents. Uploaded PDFs may contain
financial and vendor information.

## Production Smoke Tests

Authentication and authorization:

- Anonymous `/dashboard` requests redirect to sign-in.
- Anonymous API requests return `401` with `AUTHENTICATION_REQUIRED`.
- A signed-in user without an active organization cannot access business data.
- A new synchronized membership starts as Auditor.
- Cross-tenant resource identifiers return `404`.
- The approved administrator can assign business roles and cannot demote the
  last Organization Administrator.

Business workflow:

- Create or verify a Purchase Order.
- Upload a valid PDF no larger than 4 MB.
- Confirm the private Blob and tenant-owned Document record are created.
- Process the invoice and confirm the Document becomes `PARSED`.
- Retry processing the same Document and confirm no duplicate Invoice or
  Exception is created.
- Confirm matching invoices and mismatch Exceptions appear on their pages.
- Resolve an Exception and verify dashboard counts.

Operations:

- Review Vercel function logs without invoice text or stack traces in HTTP
  responses.
- Confirm Neon connection counts remain healthy through the pooled runtime URL.
- Confirm HTTPS and the production domain.

## Rollback

- Roll application code back by promoting the previous healthy Vercel
  deployment.
- Treat database rollback separately. Prefer a forward corrective migration;
  restore the pre-deployment Neon snapshot only during a controlled incident.
- Private Blob uploads are not removed by an application rollback.

## Known Production Limits

- Server uploads are capped at 4 MB so multipart overhead stays below Vercel's
  4.5 MB function request limit.
- PDF extraction runs synchronously in a Node.js function with a 60-second
  maximum duration.
- Larger documents and higher throughput will require direct client uploads and
  background processing in a later sprint.
