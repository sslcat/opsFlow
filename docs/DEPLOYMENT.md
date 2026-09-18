# Deployment

## Production Stack

Frontend

- Vercel

Backend

- Next.js Route Handlers

Database

- Neon PostgreSQL

Authentication

- Clerk

AI

- OpenAI

---

# Environment Variables

DATABASE_URL

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

CLERK_SECRET_KEY

OPENAI_API_KEY

---

# Deployment Steps

1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy
5. Verify production database
6. Verify authentication
7. Verify invoice workflow

---

# Production Checklist

Authentication

- Verify anonymous dashboard requests redirect to sign in
- Verify anonymous API requests return 401
- Verify users select an active Clerk organization
- Verify the first membership bootstrap and later least-privileged membership behavior
- Verify sign up, sign in, profile, and sign out flows

Organizations

- Apply the authorization migration before deploying tenant-aware application code
- Verify legacy records belong to `OpsFlow Legacy Data`
- Verify cross-tenant resource IDs return 404

Database

Invoice Upload

Invoice Processing

Exception Workflow

Dashboard

Logging

Monitoring

HTTPS

---

# Future Production Improvements

- Background Jobs
- Queue Processing
- Object Storage
- CDN
- Redis
- Rate Limiting
