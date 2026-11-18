-- Register the Classes & Sections permissions and grant them to the built-in roles of
-- every existing school, so admins can use the feature without re-running the seed.
INSERT INTO "Permission" ("id", "code", "description", "updatedAt")
VALUES
  (gen_random_uuid(), 'class.view', 'View classes and sections', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'class.manage', 'Create and update classes and sections', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT gen_random_uuid(), r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON (
     (p."code" IN ('class.view', 'class.manage') AND r."code" IN ('SCHOOL_ADMIN', 'PRINCIPAL'))
  OR (p."code" = 'class.view' AND r."code" IN ('TEACHER', 'ACCOUNTANT'))
)
WHERE r."organizationId" IS NOT NULL
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
