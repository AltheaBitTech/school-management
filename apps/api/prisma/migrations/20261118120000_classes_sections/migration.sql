-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "sectionId" UUID;

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "classTeacherId" UUID,
    "capacity" INTEGER,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolClass_organizationId_status_idx" ON "SchoolClass"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_organizationId_name_key" ON "SchoolClass"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Section_organizationId_status_idx" ON "Section"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Section_classTeacherId_idx" ON "Section"("classTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_name_key" ON "Section"("classId", "name");

-- CreateIndex
CREATE INDEX "Student_organizationId_sectionId_idx" ON "Student"("organizationId", "sectionId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: turn existing free-text class/section values into real records.
-- Classes are de-duplicated case-insensitively per organization (first spelling wins).
INSERT INTO "SchoolClass" ("id", "organizationId", "name", "updatedAt")
SELECT gen_random_uuid(), src."organizationId", src."name", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON ("organizationId", lower(btrim("class")))
    "organizationId", btrim("class") AS "name"
  FROM "Student"
  WHERE "class" IS NOT NULL AND btrim("class") <> ''
  ORDER BY "organizationId", lower(btrim("class")), "createdAt"
) src;

INSERT INTO "Section" ("id", "organizationId", "classId", "name", "updatedAt")
SELECT gen_random_uuid(), src."organizationId", src."classId", src."name", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (c."id", lower(btrim(s."section")))
    s."organizationId", c."id" AS "classId", btrim(s."section") AS "name"
  FROM "Student" s
  JOIN "SchoolClass" c
    ON c."organizationId" = s."organizationId"
   AND lower(c."name") = lower(btrim(s."class"))
  WHERE s."section" IS NOT NULL AND btrim(s."section") <> ''
  ORDER BY c."id", lower(btrim(s."section")), s."createdAt"
) src;

-- Link students and normalise their display labels to the canonical spelling.
UPDATE "Student" s
SET "sectionId" = sec."id",
    "class" = c."name",
    "section" = sec."name",
    "className" = c."name" || ' - Section ' || sec."name"
FROM "Section" sec
JOIN "SchoolClass" c ON c."id" = sec."classId"
WHERE c."organizationId" = s."organizationId"
  AND lower(c."name") = lower(btrim(s."class"))
  AND lower(sec."name") = lower(btrim(s."section"));
