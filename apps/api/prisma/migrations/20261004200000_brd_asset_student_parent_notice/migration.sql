-- AlterEnum
ALTER TYPE "NoticeAudienceType" ADD VALUE IF NOT EXISTS 'PARENT';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "assignedStudentId" UUID;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedStudentId_fkey" FOREIGN KEY ("assignedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Asset_organizationId_assignedStudentId_idx" ON "Asset"("organizationId", "assignedStudentId");
