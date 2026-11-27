-- Custom roles: admins can create roles and edit role permissions.
ALTER TABLE "Role" ADD COLUMN "description" TEXT;
ALTER TABLE "Role" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Role" ADD COLUMN "permissionsCustomizedAt" TIMESTAMP(3);

-- Every role that exists today was seeded from code.
UPDATE "Role" SET "isSystem" = true;

-- Register role management permissions and grant them to School Admin in every school.
INSERT INTO "Permission" ("id", "code", "description", "updatedAt")
VALUES
  (gen_random_uuid(), 'role.create', 'Create custom roles', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'role.update', 'Edit role names and permissions', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'role.delete', 'Delete custom roles', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."code" IN ('role.create', 'role.update', 'role.delete')
WHERE r."organizationId" IS NOT NULL AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
