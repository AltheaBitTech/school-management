-- AlterTable
ALTER TABLE "Visitor" ADD COLUMN "photoFileId" UUID;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
