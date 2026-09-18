-- Link processed invoices to their source document so processing retries are idempotent.
ALTER TABLE "Invoice" ADD COLUMN "sourceDocumentId" TEXT;

CREATE UNIQUE INDEX "Invoice_organizationId_sourceDocumentId_key"
ON "Invoice"("organizationId", "sourceDocumentId");

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_sourceDocumentId_organizationId_fkey"
FOREIGN KEY ("sourceDocumentId", "organizationId")
REFERENCES "Document"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
