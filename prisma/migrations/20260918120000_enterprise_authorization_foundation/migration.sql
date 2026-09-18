-- Expand identity models so existing MVP users and organizations remain valid.
ALTER TABLE "User"
  ADD COLUMN "clerkUserId" TEXT,
  ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "Organization"
  ADD COLUMN "clerkOrganizationId" TEXT;

-- Create the OpsFlow-owned business authorization model.
CREATE TABLE "OrganizationMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipRole" (
  "membershipId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("membershipId", "roleId")
);

CREATE TABLE "RolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");
CREATE UNIQUE INDEX "Organization_clerkOrganizationId_key" ON "Organization"("clerkOrganizationId");
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE INDEX "MembershipRole_roleId_idx" ON "MembershipRole"("roleId");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

ALTER TABLE "OrganizationMembership"
  ADD CONSTRAINT "OrganizationMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OrganizationMembership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipRole"
  ADD CONSTRAINT "MembershipRole_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MembershipRole_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the accepted system roles.
INSERT INTO "Role" ("id", "key", "name", "description", "createdAt", "updatedAt") VALUES
  ('role-organization-administrator', 'organization_administrator', 'Organization Administrator', 'Manages the OpsFlow organization and its business authorization.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-controller', 'controller', 'Controller', 'Oversees financial operations and exception resolution.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-ap-manager', 'ap_manager', 'AP Manager', 'Manages accounts payable processing and exceptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-ap-specialist', 'ap_specialist', 'AP Specialist', 'Processes documents and invoices and resolves routine exceptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-procurement', 'procurement', 'Procurement', 'Manages purchase orders and reviews related exceptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-auditor', 'auditor', 'Auditor', 'Has read-only access to business and audit data.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed stable resource/action permission keys from ADR-0003.
INSERT INTO "Permission" ("id", "key", "description", "createdAt", "updatedAt") VALUES
  ('permission-organization-read', 'organization.read', 'View the active organization.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-organization-manage', 'organization.manage', 'Manage the active organization.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-membership-read', 'membership.read', 'View organization memberships.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-membership-manage', 'membership.manage', 'Manage organization memberships.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-role-read', 'role.read', 'View business roles.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-role-manage', 'role.manage', 'Manage business role assignments.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-order-read', 'order.read', 'View purchase orders.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-order-create', 'order.create', 'Create purchase orders.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-order-update', 'order.update', 'Update purchase orders.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-document-read', 'document.read', 'View document metadata.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-document-upload', 'document.upload', 'Upload documents.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-document-process', 'document.process', 'Extract and process documents.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-invoice-read', 'invoice.read', 'View invoices.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-invoice-create', 'invoice.create', 'Create invoices.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-invoice-update', 'invoice.update', 'Update invoices.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-invoice-process', 'invoice.process', 'Process and match invoices.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-exception-read', 'exception.read', 'View exceptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-exception-triage', 'exception.triage', 'Create and triage exceptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-exception-assign', 'exception.assign', 'Assign exceptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-exception-resolve', 'exception.resolve', 'Resolve exceptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('permission-audit-read', 'audit.read', 'View audit history.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Organization administrators receive every permission.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-organization-administrator', "id" FROM "Permission";

-- Controllers have broad financial authority but cannot administer roles or memberships.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-controller', "id" FROM "Permission"
WHERE "key" IN (
  'organization.read', 'membership.read', 'role.read',
  'order.read', 'document.read', 'document.upload', 'document.process',
  'invoice.read', 'invoice.create', 'invoice.update', 'invoice.process',
  'exception.read', 'exception.triage', 'exception.assign', 'exception.resolve',
  'audit.read'
);

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-ap-manager', "id" FROM "Permission"
WHERE "key" IN (
  'organization.read', 'membership.read', 'role.read', 'order.read',
  'document.read', 'document.upload', 'document.process',
  'invoice.read', 'invoice.create', 'invoice.update', 'invoice.process',
  'exception.read', 'exception.triage', 'exception.assign', 'exception.resolve'
);

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-ap-specialist', "id" FROM "Permission"
WHERE "key" IN (
  'organization.read', 'order.read', 'document.read', 'document.upload', 'document.process',
  'invoice.read', 'invoice.create', 'invoice.process',
  'exception.read', 'exception.triage', 'exception.resolve'
);

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-procurement', "id" FROM "Permission"
WHERE "key" IN (
  'organization.read', 'order.read', 'order.create', 'order.update',
  'document.read', 'document.upload', 'invoice.read', 'exception.read', 'exception.triage'
);

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'role-auditor', "id" FROM "Permission"
WHERE "key" IN (
  'organization.read', 'membership.read', 'role.read', 'order.read',
  'document.read', 'invoice.read', 'exception.read', 'audit.read'
);

-- Expand business records with nullable ownership and storage columns.
ALTER TABLE "Document" ADD COLUMN "organizationId" TEXT, ADD COLUMN "storageKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Exception" ADD COLUMN "organizationId" TEXT;

-- Explicit legacy tenant: ownership is never inferred from business fields or a Clerk session.
INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
VALUES ('legacy-organization', 'OpsFlow Legacy Data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Document"
SET "organizationId" = 'legacy-organization', "storageKey" = "fileName"
WHERE "organizationId" IS NULL;
UPDATE "Order" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;
UPDATE "Invoice" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;
UPDATE "Exception" SET "organizationId" = 'legacy-organization' WHERE "organizationId" IS NULL;

-- Enforce ownership only after every legacy record has been backfilled.
ALTER TABLE "Document" ALTER COLUMN "organizationId" SET NOT NULL, ALTER COLUMN "storageKey" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Exception" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Replace global lookup indexes with tenant-aware indexes and constraints.
DROP INDEX "Order_poNumber_idx";
DROP INDEX "Invoice_invoiceNumber_idx";
DROP INDEX "Invoice_poNumber_idx";
DROP INDEX "Exception_status_idx";
DROP INDEX "Exception_type_idx";
DROP INDEX "Exception_poNumber_idx";

CREATE INDEX "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");
CREATE INDEX "Document_organizationId_storageKey_idx" ON "Document"("organizationId", "storageKey");
CREATE UNIQUE INDEX "Document_id_organizationId_key" ON "Document"("id", "organizationId");
CREATE UNIQUE INDEX "Order_organizationId_poNumber_key" ON "Order"("organizationId", "poNumber");
CREATE UNIQUE INDEX "Order_id_organizationId_key" ON "Order"("id", "organizationId");
CREATE INDEX "Order_organizationId_createdAt_idx" ON "Order"("organizationId", "createdAt");
CREATE INDEX "Invoice_organizationId_invoiceNumber_idx" ON "Invoice"("organizationId", "invoiceNumber");
CREATE INDEX "Invoice_organizationId_poNumber_idx" ON "Invoice"("organizationId", "poNumber");
CREATE INDEX "Invoice_organizationId_createdAt_idx" ON "Invoice"("organizationId", "createdAt");
CREATE UNIQUE INDEX "Invoice_id_organizationId_key" ON "Invoice"("id", "organizationId");
CREATE INDEX "Exception_organizationId_status_idx" ON "Exception"("organizationId", "status");
CREATE INDEX "Exception_organizationId_type_idx" ON "Exception"("organizationId", "type");
CREATE INDEX "Exception_organizationId_poNumber_idx" ON "Exception"("organizationId", "poNumber");
CREATE INDEX "Exception_organizationId_createdAt_idx" ON "Exception"("organizationId", "createdAt");
CREATE UNIQUE INDEX "Exception_id_organizationId_key" ON "Exception"("id", "organizationId");
