# Sprint 2 Pull Request Review

You are acting as the Principal Engineer reviewing the `feature/authorization` branch before merge.

## Instructions

Read:

- AGENTS.md
- Everything under `docs/`
- Every ADR
- `docs/sprints/SPRINT-002.md`

Do **not** modify files.

Do **not** create commits.

Do **not** apply migrations.

Do **not** change documentation.

This is a pull request review only.

---

## Review Scope

Review the implementation against:

- ADR-0001 Authorization Model
- ADR-0002 Multi-Tenant Data Ownership
- ADR-0003 Business RBAC and Permissions

Review:

1. Tenant isolation
2. Cross-tenant access
3. Clerk integration
4. Organization membership
5. Role implementation
6. Permission enforcement
7. Authorization context
8. Prisma schema
9. Migration safety
10. Legacy data migration
11. Upload ownership
12. Invoice ownership
13. Exception ownership
14. API authorization
15. Server Component authorization
16. Transaction boundaries
17. Tests
18. Build
19. Documentation consistency

---

## Output

Classify every finding as:

- Blocking
- High
- Medium
- Low

For every finding include:

- Evidence
- Risk
- Recommendation

Finally provide one of:

APPROVE

or

REQUEST CHANGES

with justification.

Do not modify any code.