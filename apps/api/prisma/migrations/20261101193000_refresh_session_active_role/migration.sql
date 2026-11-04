-- AlterTable
ALTER TABLE "RefreshSession" ADD COLUMN "activeRoleId" UUID;

-- CreateIndex
CREATE INDEX "RefreshSession_activeRoleId_idx" ON "RefreshSession"("activeRoleId");

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_activeRoleId_fkey" FOREIGN KEY ("activeRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
