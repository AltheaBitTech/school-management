-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "userId" UUID,
ADD COLUMN     "class" TEXT,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "rollNumber" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "academicYear" TEXT;

-- AlterTable
ALTER TABLE "FeeStructure" ADD COLUMN     "installmentLabel" TEXT,
ADD COLUMN     "dueDate" DATE,
ADD COLUMN     "academicYear" TEXT;

-- CreateIndex
CREATE INDEX "Student_organizationId_studentClass_idx" ON "Student"("organizationId", "class");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
