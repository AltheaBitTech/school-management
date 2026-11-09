-- Store bcrypt hash for school admin password until platform approval (then copied to User).
ALTER TABLE "OrganizationRegistrationRequest" ADD COLUMN "adminPasswordHash" TEXT;
