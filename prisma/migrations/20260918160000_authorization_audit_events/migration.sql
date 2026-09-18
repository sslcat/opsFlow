-- Record explicit operator and administrator authorization decisions.
CREATE TABLE "AuthorizationAuditEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorIdentifier" TEXT NOT NULL,
  "targetMembershipId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthorizationAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthorizationAuditEvent_organizationId_createdAt_idx"
  ON "AuthorizationAuditEvent"("organizationId", "createdAt");
CREATE INDEX "AuthorizationAuditEvent_action_createdAt_idx"
  ON "AuthorizationAuditEvent"("action", "createdAt");

ALTER TABLE "AuthorizationAuditEvent"
  ADD CONSTRAINT "AuthorizationAuditEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
