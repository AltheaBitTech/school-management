-- Phase 6: Complaint and maintenance models.

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('ELECTRICAL', 'PLUMBING', 'FURNITURE', 'IT', 'CLEANING', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateTable
CREATE TABLE "Complaint" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "complaintCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "priority" "ComplaintPriority" NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdByUserId" UUID NOT NULL,
    "assignedToStaffId" UUID,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintHistory" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "oldStatus" "ComplaintStatus",
    "newStatus" "ComplaintStatus",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_organizationId_status_idx" ON "Complaint"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Complaint_organizationId_priority_idx" ON "Complaint"("organizationId", "priority");

-- CreateIndex
CREATE INDEX "Complaint_organizationId_assignedToStaffId_idx" ON "Complaint"("organizationId", "assignedToStaffId");

-- CreateIndex
CREATE INDEX "Complaint_organizationId_createdAt_idx" ON "Complaint"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_organizationId_complaintCode_key" ON "Complaint"("organizationId", "complaintCode");

-- CreateIndex
CREATE INDEX "ComplaintHistory_organizationId_complaintId_idx" ON "ComplaintHistory"("organizationId", "complaintId");

-- CreateIndex
CREATE INDEX "ComplaintHistory_complaintId_createdAt_idx" ON "ComplaintHistory"("complaintId", "createdAt");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedToStaffId_fkey" FOREIGN KEY ("assignedToStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintHistory" ADD CONSTRAINT "ComplaintHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintHistory" ADD CONSTRAINT "ComplaintHistory_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintHistory" ADD CONSTRAINT "ComplaintHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
