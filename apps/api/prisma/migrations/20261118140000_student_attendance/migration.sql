-- CreateTable
CREATE TABLE "StudentAttendance" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "markedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionAttendanceSubstitute" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT,
    "createdByUserId" UUID NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionAttendanceSubstitute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentAttendance_organizationId_sectionId_attendanceDate_idx" ON "StudentAttendance"("organizationId", "sectionId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAttendance_organizationId_studentId_attendanceDate_key" ON "StudentAttendance"("organizationId", "studentId", "attendanceDate");

-- CreateIndex
CREATE INDEX "SectionAttendanceSubstitute_organizationId_sectionId_fromDa_idx" ON "SectionAttendanceSubstitute"("organizationId", "sectionId", "fromDate", "toDate");

-- CreateIndex
CREATE INDEX "SectionAttendanceSubstitute_organizationId_staffId_fromDate_idx" ON "SectionAttendanceSubstitute"("organizationId", "staffId", "fromDate", "toDate");

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_markedByUserId_fkey" FOREIGN KEY ("markedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionAttendanceSubstitute" ADD CONSTRAINT "SectionAttendanceSubstitute_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionAttendanceSubstitute" ADD CONSTRAINT "SectionAttendanceSubstitute_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionAttendanceSubstitute" ADD CONSTRAINT "SectionAttendanceSubstitute_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionAttendanceSubstitute" ADD CONSTRAINT "SectionAttendanceSubstitute_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Register student attendance permissions and grant them to the built-in roles of
-- every existing organization, so the feature works without re-running the seed.
INSERT INTO "Permission" ("id", "code", "description", "updatedAt")
VALUES
  (gen_random_uuid(), 'student.attendance.view', 'View student attendance', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'student.attendance.mark', 'Mark student attendance for own or substitute sections', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'student.attendance.manage', 'Mark student attendance for any section and assign substitutes', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON (
     (p."code" IN ('student.attendance.view', 'student.attendance.mark', 'student.attendance.manage') AND r."code" = 'SCHOOL_ADMIN')
  OR (p."code" IN ('student.attendance.view', 'student.attendance.manage') AND r."code" = 'PRINCIPAL')
  OR (p."code" IN ('student.attendance.view', 'student.attendance.mark') AND r."code" = 'TEACHER')
)
WHERE r."organizationId" IS NOT NULL
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
