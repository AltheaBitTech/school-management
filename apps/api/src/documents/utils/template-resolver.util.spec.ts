import { StudentStatus } from '@prisma/client';
import { parseDocumentTemplateContent, resolveTemplateText } from './template-resolver.util';

describe('template-resolver.util', () => {
  const student = {
    id: 'student-id',
    organizationId: 'org-id',
    studentCode: 'adm-001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    displayName: null,
    dateOfBirth: null,
    className: 'Grade 8-A',
    userId: null,
    studentClass: null,
    sectionId: null,
    section: null,
    rollNumber: null,
    guardianName: null,
    guardianPhone: null,
    academicYear: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;

  const organization = {
    id: 'org-id',
    name: 'Green Valley School',
    code: 'gvs',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;

  it('resolves allowed student and organization variables', () => {
    const parsed = parseDocumentTemplateContent(
      JSON.stringify({
        title: 'Bonafide Certificate',
        body: '{{student.name}} / {{student.admissionNumber}} / {{organization.name}} / {{student.class}}',
      }),
    );

    const resolved = resolveTemplateText(parsed, {
      student,
      organization,
      generatedAt: new Date('2026-09-17T10:00:00.000Z'),
    });

    expect(resolved.body).toBe('Aarav Sharma / adm-001 / Green Valley School / Grade 8-A');
  });

  it('leaves unsupported placeholders unchanged', () => {
    const parsed = parseDocumentTemplateContent(
      JSON.stringify({
        title: 'Bonafide Certificate',
        body: '{{student.secret}}',
      }),
    );

    const resolved = resolveTemplateText(parsed, {
      student,
      organization,
      generatedAt: new Date('2026-09-17T10:00:00.000Z'),
    });

    expect(resolved.body).toBe('{{student.secret}}');
  });
});
