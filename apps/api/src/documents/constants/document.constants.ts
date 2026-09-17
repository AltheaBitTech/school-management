export const DOCUMENT_ERROR_CODES = {
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_TEMPLATE_NOT_FOUND: 'DOCUMENT_TEMPLATE_NOT_FOUND',
  DOCUMENT_TYPE_NOT_SUPPORTED: 'DOCUMENT_TYPE_NOT_SUPPORTED',
  DOCUMENT_GENERATION_FAILED: 'DOCUMENT_GENERATION_FAILED',
  DOCUMENT_FILE_NOT_FOUND: 'DOCUMENT_FILE_NOT_FOUND',
  INVALID_TEMPLATE_CONTENT: 'INVALID_TEMPLATE_CONTENT',
} as const;

export const BONAFIDE_TEMPLATE_DEFINITION = {
  name: 'Bonafide Certificate',
  content: JSON.stringify({
    title: 'Bonafide Certificate',
    body: [
      'This is to certify that {{student.name}}, bearing admission number {{student.admissionNumber}},',
      'is a bonafide student of {{organization.name}}{{student.classLine}}.',
      '',
      'This certificate is issued on {{generated.date}} for official purposes.',
    ].join('\n'),
  }),
  version: 1,
} as const;

export const ALLOWED_TEMPLATE_VARIABLES = [
  'student.name',
  'student.admissionNumber',
  'student.class',
  'student.classLine',
  'organization.name',
  'organization.code',
  'generated.date',
] as const;
