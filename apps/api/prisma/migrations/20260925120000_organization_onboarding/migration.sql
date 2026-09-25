-- Existing organizations default to completed so login behavior is unchanged.
ALTER TABLE "OrganizationSettings"
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT true;
