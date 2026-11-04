/** India mobile: optional +91 prefix, then 10 digits starting 6–9. */
export const INDIA_MOBILE_PATTERN = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export function isValidIndiaMobile(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && INDIA_MOBILE_PATTERN.test(trimmed);
}

export const INDIA_MOBILE_HELPER_TEXT =
  'Enter a 10-digit mobile number (optional +91 prefix).';
