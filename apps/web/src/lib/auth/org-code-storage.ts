const LAST_ORG_CODE_KEY = 'campusops.lastOrganizationCode';

export function getRememberedOrganizationCode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const value = window.localStorage.getItem(LAST_ORG_CODE_KEY);
  return value?.trim() ? value.trim() : null;
}

export function rememberOrganizationCode(organizationCode: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const normalized = organizationCode.trim();
  if (!normalized) {
    return;
  }
  window.localStorage.setItem(LAST_ORG_CODE_KEY, normalized);
}
