export function assertSameOrganization(
  resourceOrganizationId: string,
  authenticatedOrganizationId: string,
): boolean {
  return resourceOrganizationId === authenticatedOrganizationId;
}
