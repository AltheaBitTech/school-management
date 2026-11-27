import {
  ASSIGNABLE_ORGANIZATION_PERMISSIONS,
  groupPermissions,
  isPlatformPermission,
} from './permission-groups';

describe('permission-groups', () => {
  it('excludes platform permissions from the assignable catalog', () => {
    expect(ASSIGNABLE_ORGANIZATION_PERMISSIONS.some((p) => isPlatformPermission(p.code))).toBe(
      false,
    );
  });

  it('places every assignable permission in exactly one named group', () => {
    const groups = groupPermissions();
    const grouped = groups.flatMap((group) => group.permissions.map((p) => p.code));

    expect(grouped.sort()).toEqual(ASSIGNABLE_ORGANIZATION_PERMISSIONS.map((p) => p.code).sort());
    expect(groups.find((group) => group.key === 'other')).toBeUndefined();
  });

  it('routes specific prefixes before general ones', () => {
    const groups = groupPermissions();
    const keyOf = (code: string) =>
      groups.find((group) => group.permissions.some((p) => p.code === code))?.key;

    expect(keyOf('student.self.view')).toBe('student_self');
    expect(keyOf('student.attendance.mark')).toBe('student_attendance');
    expect(keyOf('student.view')).toBe('students');
    expect(keyOf('staff.self.leave.create')).toBe('staff_self');
    expect(keyOf('report.fees.view')).toBe('reports');
  });
});
