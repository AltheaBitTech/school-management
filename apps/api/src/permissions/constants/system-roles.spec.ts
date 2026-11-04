import {
  ORGANIZATION_ROLE_CODES,
  ORGANIZATION_ROLE_DEFINITIONS,
} from './system-roles';
import { SYSTEM_PERMISSIONS } from './system-permissions';

describe('system-roles', () => {
  it('defines nine organization role templates including the six department roles', () => {
    expect(ORGANIZATION_ROLE_DEFINITIONS).toHaveLength(9);
    expect(Object.keys(ORGANIZATION_ROLE_CODES)).toHaveLength(9);
    expect(ORGANIZATION_ROLE_CODES.PRINCIPAL).toBe('PRINCIPAL');
    expect(ORGANIZATION_ROLE_CODES.TEACHER).toBe('TEACHER');
    expect(ORGANIZATION_ROLE_CODES.RECEPTIONIST).toBe('RECEPTIONIST');
    expect(ORGANIZATION_ROLE_CODES.MAINTENANCE_STAFF).toBe('MAINTENANCE_STAFF');
    expect(ORGANIZATION_ROLE_CODES.ACCOUNTANT).toBe('ACCOUNTANT');
    expect(ORGANIZATION_ROLE_CODES.STUDENT).toBe('STUDENT');
    expect(ORGANIZATION_ROLE_CODES.PARENT).toBe('PARENT');
  });

  it('includes student self-service permissions in the catalog', () => {
    const codes = SYSTEM_PERMISSIONS.map((permission) => permission.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'student.self.view',
        'student.self.fee.view',
        'student.self.fee.receipt.download',
        'student.self.certificate.download',
      ]),
    );
  });

  it('maps every role permission to a catalog entry', () => {
    const codes = new Set(SYSTEM_PERMISSIONS.map((permission) => permission.code));

    for (const role of ORGANIZATION_ROLE_DEFINITIONS) {
      for (const permissionCode of role.permissions) {
        expect(codes.has(permissionCode)).toBe(true);
      }
    }
  });

  it('keeps School Admin focused on administration without leave decision permissions', () => {
    const role = ORGANIZATION_ROLE_DEFINITIONS.find(
      (definition) => definition.code === ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
    );

    expect(role?.permissions).not.toContain('leave.approve');
    expect(role?.permissions).not.toContain('leave.reject');
    expect(role?.permissions).toContain('leave.view');
    expect(role?.permissions).toContain('approval.approve');
  });

  it('keeps maintenance staff limited to complaint work, notices, and file upload', () => {
    const role = ORGANIZATION_ROLE_DEFINITIONS.find(
      (definition) => definition.code === ORGANIZATION_ROLE_CODES.MAINTENANCE_STAFF,
    );

    expect(role?.permissions).toEqual([
      'complaint.view',
      'complaint.update',
      'notice.view',
      'file.create',
    ]);
  });
});
