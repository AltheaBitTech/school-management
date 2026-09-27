export const PLATFORM_ORGANIZATION_CODE = 'campusops-platform';

export function isPlatformOrganization(organizationCode: string | undefined): boolean {
  return organizationCode === PLATFORM_ORGANIZATION_CODE;
}
