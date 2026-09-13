-- Phase 4: Staff attendance business model.

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF');

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL,
    "lateFlag" BOOLEAN NOT NULL DEFAULT false,
    "earlyDepartureFlag" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "correctionRequestedAt" TIMESTAMP(3),
    "correctedByUserId" UUID,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffAttendance_organizationId_attendanceDate_idx" ON "StaffAttendance"("organizationId", "attendanceDate");

-- CreateIndex
CREATE INDEX "StaffAttendance_organizationId_status_attendanceDate_idx" ON "StaffAttendance"("organizationId", "status", "attendanceDate");

-- CreateIndex
CREATE INDEX "StaffAttendance_organizationId_staffId_idx" ON "StaffAttendance"("organizationId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_organizationId_staffId_attendanceDate_key" ON "StaffAttendance"("organizationId", "staffId", "attendanceDate");

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_correctedByUserId_fkey" FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
