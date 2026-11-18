-- Generic institutions: school / college / institute

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('SCHOOL', 'COLLEGE', 'INSTITUTE');

-- Rename notice audience value in place (preserves existing rows)
ALTER TYPE "NoticeAudienceType" RENAME VALUE 'ENTIRE_SCHOOL' TO 'ENTIRE_ORGANIZATION';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "institutionType" "InstitutionType" NOT NULL DEFAULT 'SCHOOL';

-- AlterTable
ALTER TABLE "OrganizationRegistrationRequest" ADD COLUMN "institutionType" "InstitutionType" NOT NULL DEFAULT 'SCHOOL';

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN "terminology" JSONB;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "currentTerm" INTEGER;

-- AlterTable (model AcademicUnit is mapped to the existing "SchoolClass" table)
ALTER TABLE "SchoolClass" ADD COLUMN "termCount" INTEGER;
