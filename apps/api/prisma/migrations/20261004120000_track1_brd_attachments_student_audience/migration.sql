-- AlterEnum
ALTER TYPE "NoticeAudienceType" ADD VALUE IF NOT EXISTS 'STUDENT';

-- CreateTable
CREATE TABLE "NoticeAttachment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "noticeId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintAttachment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoticeAttachment_organizationId_noticeId_idx" ON "NoticeAttachment"("organizationId", "noticeId");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeAttachment_noticeId_fileId_key" ON "NoticeAttachment"("noticeId", "fileId");

-- CreateIndex
CREATE INDEX "ComplaintAttachment_organizationId_complaintId_idx" ON "ComplaintAttachment"("organizationId", "complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintAttachment_complaintId_fileId_key" ON "ComplaintAttachment"("complaintId", "fileId");

-- AddForeignKey
ALTER TABLE "NoticeAttachment" ADD CONSTRAINT "NoticeAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAttachment" ADD CONSTRAINT "NoticeAttachment_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAttachment" ADD CONSTRAINT "NoticeAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAttachment" ADD CONSTRAINT "ComplaintAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAttachment" ADD CONSTRAINT "ComplaintAttachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAttachment" ADD CONSTRAINT "ComplaintAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
