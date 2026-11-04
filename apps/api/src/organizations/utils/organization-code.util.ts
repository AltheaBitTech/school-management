import { InternalServerErrorException } from '@nestjs/common';
import { ORGANIZATION_CODE_PATTERN } from '../constants/organization.constants';

/**
 * Organization codes are trimmed and lowercased before persistence and login lookup.
 */
export function normalizeOrganizationCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidOrganizationCode(code: string): boolean {
  return ORGANIZATION_CODE_PATTERN.test(code);
}

export function slugifyOrganizationName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug.length >= 3) {
    return slug.slice(0, 64);
  }

  if (slug.length > 0) {
    return `${slug}-school`.slice(0, 64);
  }

  return 'school';
}

export function buildOrganizationCodeCandidates(
  organizationName: string,
  preferredCode?: string | null,
): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  function add(candidate: string): void {
    const normalized = normalizeOrganizationCode(candidate);
    if (!isValidOrganizationCode(normalized) || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    candidates.push(normalized);
  }

  if (preferredCode?.trim()) {
    add(preferredCode);
  }

  const base = slugifyOrganizationName(organizationName);
  add(base);
  for (let suffix = 2; suffix <= 50; suffix += 1) {
    add(`${base}-${suffix}`);
  }

  return candidates;
}

export function generateOrganizationCodeCandidate(): string {
  return `school-${Math.random().toString(36).substring(2, 10)}`.toLowerCase();
}

export async function generateUniqueOrganizationCode(
  isCodeTaken: (code: string) => Promise<boolean>,
  maxAttempts = 10,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateOrganizationCodeCandidate();
    if (isValidOrganizationCode(code) && !(await isCodeTaken(code))) {
      return code;
    }
  }

  throw new InternalServerErrorException('Failed to generate a unique organization code');
}

export async function generateUniqueOrganizationCodeFromName(
  organizationName: string,
  preferredCode: string | null | undefined,
  isCodeTaken: (code: string) => Promise<boolean>,
): Promise<string> {
  const candidates = buildOrganizationCodeCandidates(organizationName, preferredCode);

  for (const candidate of candidates) {
    if (!(await isCodeTaken(candidate))) {
      return candidate;
    }
  }

  return generateUniqueOrganizationCode(isCodeTaken);
}

export async function pickAvailableOrganizationCode(
  organizationName: string,
  preferredCode: string | null | undefined,
  isCodeTaken: (code: string) => Promise<boolean>,
): Promise<{ code: string; available: boolean }> {
  const candidates = buildOrganizationCodeCandidates(organizationName, preferredCode);

  for (const candidate of candidates) {
    if (!(await isCodeTaken(candidate))) {
      return { code: candidate, available: true };
    }
  }

  const fallback = await generateUniqueOrganizationCode(isCodeTaken);
  return { code: fallback, available: true };
}
