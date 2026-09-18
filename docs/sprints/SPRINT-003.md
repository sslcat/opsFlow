# Sprint 3 – Production Readiness

## Status

Completed

---

# Goal

Prepare OpsFlow for its first public deployment.

This sprint focuses on production hardening rather than adding new business features.

---

# Business Value

Before customers can use OpsFlow, the application must be secure, reliable, deployable, and recoverable.

This sprint reduces operational risk before deployment.

---

# Scope

Included

- Database-backed authorization tests
- DIRECT_URL configuration for Prisma migrations
- Upload validation
- Better error handling
- Transaction improvements
- Idempotent invoice processing
- Production environment configuration
- Deployment preparation

Not Included

- AI Extraction
- Goods Receipts
- Analytics
- Audit Timeline
- New business functionality

---

# Acceptance Criteria

- All existing tests pass.
- Production build succeeds.
- Database-backed authorization tests exist.
- Upload validation is production-ready.
- Sensitive logging removed.
- Error responses standardized.
- Prisma migrations documented.
- Deployment documentation updated.
- Vercel deployment succeeds.

---

# Definition of Done

OpsFlow can be deployed safely to Vercel.

All existing functionality continues working.

The application is production-ready.

---

# Deliverables

Production-ready codebase.

Deployment guide.

Updated documentation.

Successful production deployment.

---

# Implementation Notes

- Prisma now uses a pooled `DATABASE_URL` for application traffic and a direct
  `DIRECT_URL` for migrations.
- Invoice creation, matching, and Exception creation share a transaction.
- Processed Invoices have a unique tenant-scoped source Document link, making
  processing retries idempotent.
- Uploads validate PDF signatures, media types, document types, empty files,
  and a 4 MB maximum.
- Deployed uploads use private Vercel Blob storage while development retains
  local private storage.
- API errors use stable codes and no longer expose extraction text or internal
  exception details.
- Tenant route tests cover validation and idempotent reprocessing. An opt-in
  database-backed suite is available through `npm run test:db` for disposable
  test databases.
- The production build no longer downloads fonts, and Next.js is patched to
  16.3.5.
- The Neon production schema has all five committed migrations applied.

The production release is live at
`https://opsflow-delta-brown.vercel.app`. Anonymous production smoke tests
confirmed Clerk sign-in routing, the public sign-in page, and the protected API
`401` contract. The production Neon schema was migrated before deployment and
all local regression, type, lint, Prisma validation, and production build
checks passed.
