CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELLED');

CREATE TABLE "Plan" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "studentLimit" INTEGER NOT NULL,
  "staffLimit" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

CREATE TABLE "OrganizationSubscription" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSubscription_organizationId_key" ON "OrganizationSubscription"("organizationId");

ALTER TABLE "OrganizationSubscription"
  ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationSubscription"
  ADD CONSTRAINT "OrganizationSubscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "code", "name", "studentLimit", "staffLimit", "active", "updatedAt")
VALUES
  ('11111111-1111-4111-8111-111111111111', 'TRIAL', 'Trial', 50, 10, true, CURRENT_TIMESTAMP),
  ('22222222-2222-4222-8222-222222222222', 'STANDARD', 'Standard', 2000, 500, true, CURRENT_TIMESTAMP);

INSERT INTO "OrganizationSubscription" ("id", "organizationId", "planId", "status", "currentPeriodStart", "updatedAt")
SELECT gen_random_uuid(), o."id", '11111111-1111-4111-8111-111111111111', 'TRIAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "OrganizationSubscription" s WHERE s."organizationId" = o."id"
);

CREATE TABLE "TransportRoute" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportRoute_organizationId_code_key" ON "TransportRoute"("organizationId", "code");
CREATE INDEX "TransportRoute_organizationId_active_idx" ON "TransportRoute"("organizationId", "active");

ALTER TABLE "TransportRoute"
  ADD CONSTRAINT "TransportRoute_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TransportStop" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "routeId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "address" TEXT,
  "pickupTime" TEXT,
  CONSTRAINT "TransportStop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportStop_routeId_sequence_key" ON "TransportStop"("routeId", "sequence");
CREATE INDEX "TransportStop_organizationId_routeId_idx" ON "TransportStop"("organizationId", "routeId");

ALTER TABLE "TransportStop"
  ADD CONSTRAINT "TransportStop_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransportStop"
  ADD CONSTRAINT "TransportStop_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TransportVehicle" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "registrationNumber" TEXT NOT NULL,
  "vehicleType" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "driverStaffId" UUID,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportVehicle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportVehicle_organizationId_registrationNumber_key" ON "TransportVehicle"("organizationId", "registrationNumber");
CREATE INDEX "TransportVehicle_organizationId_active_idx" ON "TransportVehicle"("organizationId", "active");

ALTER TABLE "TransportVehicle"
  ADD CONSTRAINT "TransportVehicle_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransportVehicle"
  ADD CONSTRAINT "TransportVehicle_driverStaffId_fkey"
  FOREIGN KEY ("driverStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudentTransportAssignment" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "routeId" UUID NOT NULL,
  "stopId" UUID NOT NULL,
  "vehicleId" UUID,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentTransportAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentTransportAssignment_organizationId_studentId_idx" ON "StudentTransportAssignment"("organizationId", "studentId");
CREATE INDEX "StudentTransportAssignment_organizationId_routeId_idx" ON "StudentTransportAssignment"("organizationId", "routeId");
CREATE INDEX "StudentTransportAssignment_organizationId_vehicleId_idx" ON "StudentTransportAssignment"("organizationId", "vehicleId");

ALTER TABLE "StudentTransportAssignment"
  ADD CONSTRAINT "StudentTransportAssignment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentTransportAssignment"
  ADD CONSTRAINT "StudentTransportAssignment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentTransportAssignment"
  ADD CONSTRAINT "StudentTransportAssignment_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentTransportAssignment"
  ADD CONSTRAINT "StudentTransportAssignment_stopId_fkey"
  FOREIGN KEY ("stopId") REFERENCES "TransportStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentTransportAssignment"
  ADD CONSTRAINT "StudentTransportAssignment_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
