/** Client-side normalization; must match API `normalizeOrganizationCode`. */
export function normalizeOrganizationCodeInput(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidOrganizationCodeInput(code: string): boolean {
  return /^[a-z0-9-]{3,64}$/.test(normalizeOrganizationCodeInput(code));
}
