-- Create OrganizationRegistrationRequest table
CREATE TABLE "OrganizationRegistrationRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactFirstName" TEXT NOT NULL,
    "contactLastName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" UUID,
    "organizationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "OrganizationRegistrationRequest_contactEmail_key" ON "OrganizationRegistrationRequest"("contactEmail");
CREATE UNIQUE INDEX "OrganizationRegistrationRequest_contactPhone_key" ON "OrganizationRegistrationRequest"("contactPhone");
CREATE UNIQUE INDEX "OrganizationRegistrationRequest_organizationId_key" ON "OrganizationRegistrationRequest"("organizationId");

-- Create indexes for queries
CREATE INDEX "OrganizationRegistrationRequest_status_createdAt_idx" ON "OrganizationRegistrationRequest"("status", "createdAt");
CREATE INDEX "OrganizationRegistrationRequest_status_idx" ON "OrganizationRegistrationRequest"("status");

-- Add foreign keys
ALTER TABLE "OrganizationRegistrationRequest" ADD CONSTRAINT "OrganizationRegistrationRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationRegistrationRequest" ADD CONSTRAINT "OrganizationRegistrationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
