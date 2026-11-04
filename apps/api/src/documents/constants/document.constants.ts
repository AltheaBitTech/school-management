import { DocumentOwnerType, DocumentType } from '@prisma/client';

export const DOCUMENT_ERROR_CODES = {
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_TEMPLATE_NOT_FOUND: 'DOCUMENT_TEMPLATE_NOT_FOUND',
  DOCUMENT_TYPE_NOT_SUPPORTED: 'DOCUMENT_TYPE_NOT_SUPPORTED',
  DOCUMENT_GENERATION_FAILED: 'DOCUMENT_GENERATION_FAILED',
  DOCUMENT_FILE_NOT_FOUND: 'DOCUMENT_FILE_NOT_FOUND',
  INVALID_TEMPLATE_CONTENT: 'INVALID_TEMPLATE_CONTENT',
  DOCUMENT_OWNER_INVALID: 'DOCUMENT_OWNER_INVALID',
  DOCUMENT_CONTEXT_INVALID: 'DOCUMENT_CONTEXT_INVALID',
} as const;

export interface DocumentTemplateDefinition {
  name: string;
  content: string;
  version: number;
}

function templateContent(documentType: DocumentType, title: string): string {
  return JSON.stringify({
    documentType,
    title,
    instructions: 'Rendered by CampusOps PDF generator.',
  });
}

export const DOCUMENT_TEMPLATE_DEFINITIONS: Record<DocumentType, DocumentTemplateDefinition> = {
  [DocumentType.BONAFIDE_CERTIFICATE]: {
    name: 'Bonafide Certificate',
    content: templateContent(DocumentType.BONAFIDE_CERTIFICATE, 'Bonafide Certificate'),
    version: 2,
  },
  [DocumentType.CHARACTER_CERTIFICATE]: {
    name: 'Character Certificate',
    content: templateContent(DocumentType.CHARACTER_CERTIFICATE, 'Character Certificate'),
    version: 1,
  },
  [DocumentType.EXPERIENCE_LETTER]: {
    name: 'Experience Letter',
    content: templateContent(DocumentType.EXPERIENCE_LETTER, 'Experience Letter'),
    version: 1,
  },
  [DocumentType.SALARY_CERTIFICATE]: {
    name: 'Salary Certificate',
    content: templateContent(DocumentType.SALARY_CERTIFICATE, 'Salary Certificate'),
    version: 1,
  },
  [DocumentType.VISITOR_PASS]: {
    name: 'Visitor Pass',
    content: templateContent(DocumentType.VISITOR_PASS, 'Visitor Pass'),
    version: 1,
  },
  [DocumentType.STUDENT_ID_CARD]: {
    name: 'Student ID Card',
    content: templateContent(DocumentType.STUDENT_ID_CARD, 'Student ID Card'),
    version: 1,
  },
  [DocumentType.STAFF_ID_CARD]: {
    name: 'Staff ID Card',
    content: templateContent(DocumentType.STAFF_ID_CARD, 'Staff ID Card'),
    version: 1,
  },
};

/** @deprecated Use DOCUMENT_TEMPLATE_DEFINITIONS.BONAFIDE_CERTIFICATE */
export const BONAFIDE_TEMPLATE_DEFINITION = DOCUMENT_TEMPLATE_DEFINITIONS.BONAFIDE_CERTIFICATE;

export const ALLOWED_TEMPLATE_VARIABLES = [
  'student.name',
  'student.admissionNumber',
  'student.class',
  'student.classLine',
  'organization.name',
  'organization.code',
  'generated.date',
  'staff.name',
  'staff.employeeCode',
  'staff.designation',
  'staff.department',
] as const;

export function resolveDocumentOwnerType(documentType: DocumentType): DocumentOwnerType {
  switch (documentType) {
    case DocumentType.BONAFIDE_CERTIFICATE:
    case DocumentType.CHARACTER_CERTIFICATE:
    case DocumentType.STUDENT_ID_CARD:
      return DocumentOwnerType.STUDENT;
    case DocumentType.EXPERIENCE_LETTER:
    case DocumentType.SALARY_CERTIFICATE:
    case DocumentType.STAFF_ID_CARD:
      return DocumentOwnerType.STAFF;
    case DocumentType.VISITOR_PASS:
      return DocumentOwnerType.VISITOR;
    default:
      throw new Error(`Unsupported document type: ${String(documentType)}`);
  }
}

export function documentTypeFileSlug(documentType: DocumentType): string {
  switch (documentType) {
    case DocumentType.BONAFIDE_CERTIFICATE:
      return 'bonafide';
    case DocumentType.CHARACTER_CERTIFICATE:
      return 'character';
    case DocumentType.EXPERIENCE_LETTER:
      return 'experience';
    case DocumentType.SALARY_CERTIFICATE:
      return 'salary';
    case DocumentType.VISITOR_PASS:
      return 'visitor-pass';
    case DocumentType.STUDENT_ID_CARD:
      return 'student-id';
    case DocumentType.STAFF_ID_CARD:
      return 'staff-id';
    default:
      return 'document';
  }
}
