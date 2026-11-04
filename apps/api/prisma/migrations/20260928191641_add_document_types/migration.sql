-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentOwnerType" ADD VALUE 'STAFF';
ALTER TYPE "DocumentOwnerType" ADD VALUE 'VISITOR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'CHARACTER_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'EXPERIENCE_LETTER';
ALTER TYPE "DocumentType" ADD VALUE 'SALARY_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'VISITOR_PASS';

-- AlterTable
ALTER TABLE "OrganizationRegistrationRequest" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "OrganizationRegistrationRequest_contactEmail_idx" ON "OrganizationRegistrationRequest"("contactEmail");
