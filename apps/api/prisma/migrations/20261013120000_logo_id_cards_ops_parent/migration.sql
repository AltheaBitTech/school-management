ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'STUDENT_ID_CARD';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'STAFF_ID_CARD';

ALTER TYPE "ApprovalEntityType" ADD VALUE IF NOT EXISTS 'MAINTENANCE';
ALTER TYPE "ApprovalEntityType" ADD VALUE IF NOT EXISTS 'PURCHASE';
ALTER TYPE "ApprovalEntityType" ADD VALUE IF NOT EXISTS 'BUDGET';

ALTER TABLE "OrganizationSettings" ADD COLUMN IF NOT EXISTS "logoFileId" UUID;

DO $$ BEGIN
  ALTER TABLE "OrganizationSettings"
    ADD CONSTRAINT "OrganizationSettings_logoFileId_fkey"
    FOREIGN KEY ("logoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OperationalRequest" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "requestType" "ApprovalEntityType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2),
  "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "submittedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperationalRequest_organizationId_status_idx" ON "OperationalRequest"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "OperationalRequest_organizationId_requestType_idx" ON "OperationalRequest"("organizationId", "requestType");

DO $$ BEGIN
  ALTER TABLE "OperationalRequest"
    ADD CONSTRAINT "OperationalRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OperationalRequest"
    ADD CONSTRAINT "OperationalRequest_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ParentStudentLink" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "parentUserId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentStudentLink_parentUserId_studentId_key" ON "ParentStudentLink"("parentUserId", "studentId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_organizationId_parentUserId_idx" ON "ParentStudentLink"("organizationId", "parentUserId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_organizationId_studentId_idx" ON "ParentStudentLink"("organizationId", "studentId");

DO $$ BEGIN
  ALTER TABLE "ParentStudentLink"
    ADD CONSTRAINT "ParentStudentLink_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ParentStudentLink"
    ADD CONSTRAINT "ParentStudentLink_parentUserId_fkey"
    FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ParentStudentLink"
    ADD CONSTRAINT "ParentStudentLink_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
