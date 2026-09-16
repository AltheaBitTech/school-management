-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('CHECKED_IN', 'CHECKED_OUT');

-- CreateEnum
CREATE TYPE "VisitorHistoryEvent" AS ENUM ('CHECKED_IN', 'CHECKED_OUT');

-- CreateTable
CREATE TABLE "Visitor" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "visitorCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "organizationName" TEXT,
    "vehicleNumber" TEXT,
    "purpose" TEXT NOT NULL,
    "hostStaffId" UUID NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "status" "VisitorStatus" NOT NULL,
    "remarks" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorHistory" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "visitorId" UUID NOT NULL,
    "eventType" "VisitorHistoryEvent" NOT NULL,
    "comment" TEXT,
    "actorUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_organizationId_visitorCode_key" ON "Visitor"("organizationId", "visitorCode");

-- CreateIndex
CREATE INDEX "Visitor_organizationId_status_checkInAt_idx" ON "Visitor"("organizationId", "status", "checkInAt");

-- CreateIndex
CREATE INDEX "Visitor_organizationId_hostStaffId_checkInAt_idx" ON "Visitor"("organizationId", "hostStaffId", "checkInAt");

-- CreateIndex
CREATE INDEX "Visitor_organizationId_mobile_idx" ON "Visitor"("organizationId", "mobile");

-- CreateIndex
CREATE INDEX "Visitor_organizationId_createdAt_idx" ON "Visitor"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "VisitorHistory_organizationId_visitorId_createdAt_idx" ON "VisitorHistory"("organizationId", "visitorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_hostStaffId_fkey" FOREIGN KEY ("hostStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorHistory" ADD CONSTRAINT "VisitorHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorHistory" ADD CONSTRAINT "VisitorHistory_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorHistory" ADD CONSTRAINT "VisitorHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
