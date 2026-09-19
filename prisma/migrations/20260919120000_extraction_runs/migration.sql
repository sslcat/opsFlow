CREATE TABLE "ExtractionRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtractionRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExtractionRun_organizationId_documentId_createdAt_idx"
ON "ExtractionRun"("organizationId", "documentId", "createdAt");
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_documentId_organizationId_fkey"
FOREIGN KEY ("documentId", "organizationId") REFERENCES "Document"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
