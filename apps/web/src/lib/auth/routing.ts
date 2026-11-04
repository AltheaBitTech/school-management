export const PERMISSION_DASHBOARD_VIEW = 'dashboard.view';
export const PERMISSION_STAFF_SELF_VIEW = 'staff.self.view';
export const PERMISSION_STUDENT_SELF_VIEW = 'student.self.view';
export const PERMISSION_PARENT_PORTAL_VIEW = 'parent.portal.view';

export function hasPermission(permissions: string[] | undefined, code: string): boolean {
  return Boolean(permissions?.includes(code));
}

export function isOperationalDashboardUser(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, PERMISSION_DASHBOARD_VIEW);
}

export function isStaffSelfServiceUser(permissions: string[] | undefined): boolean {
  return (
    hasPermission(permissions, PERMISSION_STAFF_SELF_VIEW) &&
    !isOperationalDashboardUser(permissions)
  );
}

export function isStudentSelfServiceUser(permissions: string[] | undefined): boolean {
  return (
    hasPermission(permissions, PERMISSION_STUDENT_SELF_VIEW) &&
    !isOperationalDashboardUser(permissions)
  );
}

export function isParentSelfServiceUser(permissions: string[] | undefined): boolean {
  return (
    hasPermission(permissions, PERMISSION_PARENT_PORTAL_VIEW) &&
    !isOperationalDashboardUser(permissions) &&
    !isStudentSelfServiceUser(permissions)
  );
}

export function resolveHomePath(permissions: string[] | undefined): string {
  if (isOperationalDashboardUser(permissions)) {
    return '/';
  }
  if (isStaffSelfServiceUser(permissions)) {
    return '/staff/dashboard';
  }
  if (isStudentSelfServiceUser(permissions)) {
    return '/student/profile';
  }
  if (isParentSelfServiceUser(permissions)) {
    return '/parent';
  }
  return '/';
}
