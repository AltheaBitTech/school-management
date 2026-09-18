-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SPORTS_DAY', 'PTM', 'HOLIDAY', 'EXAMINATION', 'MEETING', 'ANNUAL_DAY');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventParticipantType" AS ENUM ('STAFF', 'STUDENT');

-- CreateTable
CREATE TABLE "Venue" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "venueId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "participantType" "EventParticipantType" NOT NULL,
    "participantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venue_organizationId_active_idx" ON "Venue"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_organizationId_name_key" ON "Venue"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Event_organizationId_status_startAt_idx" ON "Event"("organizationId", "status", "startAt");

-- CreateIndex
CREATE INDEX "Event_organizationId_venueId_startAt_endAt_idx" ON "Event"("organizationId", "venueId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Event_organizationId_type_startAt_idx" ON "Event"("organizationId", "type", "startAt");

-- CreateIndex
CREATE INDEX "EventParticipant_organizationId_eventId_idx" ON "EventParticipant"("organizationId", "eventId");

-- CreateIndex
CREATE INDEX "EventParticipant_organizationId_participantType_participant_idx" ON "EventParticipant"("organizationId", "participantType", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_organizationId_eventId_participantType_par_key" ON "EventParticipant"("organizationId", "eventId", "participantType", "participantId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "LeaveBalance_organizationId_staffId_leaveTypeId_periodStart_per" RENAME TO "LeaveBalance_organizationId_staffId_leaveTypeId_periodStart_key";
