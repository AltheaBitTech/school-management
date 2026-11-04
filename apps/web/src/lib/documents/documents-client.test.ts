import { describe, expect, it } from 'vitest';
import { documentTemplatesForPermissions } from '@/lib/documents/documents-client';

describe('documentTemplatesForPermissions', () => {
  it('keeps a receptionist on visitor passes', () => {
    const templates = documentTemplatesForPermissions([
      'visitor.view',
      'document.generate',
      'notice.view',
    ]);
    expect(templates.map((template) => template.type)).toEqual(['VISITOR_PASS']);
  });

  it('gives a school admin every template', () => {
    const templates = documentTemplatesForPermissions(['student.view', 'staff.view', 'visitor.view']);
    expect(templates.map((template) => template.ownerType)).toEqual([
      'STUDENT',
      'STUDENT',
      'STAFF',
      'STAFF',
      'VISITOR',
      'STUDENT',
      'STAFF',
    ]);
  });

  it('lets an accountant generate from a limited subject list', () => {
    const templates = documentTemplatesForPermissions(['document.generate', 'fee.view', 'asset.view']);
    expect(templates).toHaveLength(7);
    expect(templates.map((template) => template.type)).toContain('BONAFIDE_CERTIFICATE');
    expect(templates.map((template) => template.type)).toContain('VISITOR_PASS');
  });
});
