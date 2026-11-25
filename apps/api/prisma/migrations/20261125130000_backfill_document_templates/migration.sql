-- Organizations created before a document type existed never received that default template.
-- Insert only the missing rows. Existing template text stays as the organization saved it.

INSERT INTO "DocumentTemplate" (
  "id",
  "organizationId",
  "name",
  "documentType",
  "content",
  "version",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  organization."id",
  missing.name,
  missing.document_type::"DocumentType",
  missing.content,
  missing.version,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" AS organization
CROSS JOIN (
  VALUES
    (
      'Bonafide Certificate',
      'BONAFIDE_CERTIFICATE',
      '{"documentType":"BONAFIDE_CERTIFICATE","title":"Bonafide Certificate","instructions":"Rendered by CampusOps PDF generator."}',
      2
    ),
    (
      'Character Certificate',
      'CHARACTER_CERTIFICATE',
      '{"documentType":"CHARACTER_CERTIFICATE","title":"Character Certificate","instructions":"Rendered by CampusOps PDF generator."}',
      1
    ),
    (
      'Experience Letter',
      'EXPERIENCE_LETTER',
      '{"documentType":"EXPERIENCE_LETTER","title":"Experience Letter","instructions":"Rendered by CampusOps PDF generator."}',
      1
    ),
    (
      'Salary Certificate',
      'SALARY_CERTIFICATE',
      '{"documentType":"SALARY_CERTIFICATE","title":"Salary Certificate","instructions":"Rendered by CampusOps PDF generator."}',
      1
    ),
    (
      'Visitor Pass',
      'VISITOR_PASS',
      '{"documentType":"VISITOR_PASS","title":"Visitor Pass","instructions":"Rendered by CampusOps PDF generator."}',
      1
    ),
    (
      'Student ID Card',
      'STUDENT_ID_CARD',
      '{"documentType":"STUDENT_ID_CARD","title":"Student ID Card","instructions":"Rendered by CampusOps PDF generator."}',
      1
    ),
    (
      'Staff ID Card',
      'STAFF_ID_CARD',
      '{"documentType":"STAFF_ID_CARD","title":"Staff ID Card","instructions":"Rendered by CampusOps PDF generator."}',
      1
    )
) AS missing(name, document_type, content, version)
WHERE NOT EXISTS (
  SELECT 1
  FROM "DocumentTemplate" AS template
  WHERE template."organizationId" = organization."id"
    AND template."documentType" = missing.document_type::"DocumentType"
);
