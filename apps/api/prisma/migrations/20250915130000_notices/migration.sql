-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NoticeAudienceType" AS ENUM ('ENTIRE_SCHOOL', 'STAFF', 'DEPARTMENT');

-- CreateTable
CREATE TABLE "Notice" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeAudience" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "noticeId" UUID NOT NULL,
    "audienceType" "NoticeAudienceType" NOT NULL,
    "departmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeRead" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "noticeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notice_organizationId_status_idx" ON "Notice"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Notice_organizationId_publishedAt_idx" ON "Notice"("organizationId", "publishedAt");

-- CreateIndex
CREATE INDEX "Notice_organizationId_scheduledAt_idx" ON "Notice"("organizationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notice_organizationId_createdAt_idx" ON "Notice"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "NoticeAudience_organizationId_noticeId_idx" ON "NoticeAudience"("organizationId", "noticeId");

-- CreateIndex
CREATE INDEX "NoticeAudience_organizationId_departmentId_idx" ON "NoticeAudience"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX "NoticeRead_organizationId_noticeId_idx" ON "NoticeRead"("organizationId", "noticeId");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeRead_organizationId_noticeId_userId_key" ON "NoticeRead"("organizationId", "noticeId", "userId");

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAudience" ADD CONSTRAINT "NoticeAudience_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAudience" ADD CONSTRAINT "NoticeAudience_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAudience" ADD CONSTRAINT "NoticeAudience_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
