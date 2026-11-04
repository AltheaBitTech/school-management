import { isValidOrganizationCodeInput, normalizeOrganizationCodeInput } from '@/lib/organizations/organization-code';

export function trimToEmpty(value: string): string {
  return value.trim();
}

export function validateRequired(value: string, label: string): string | undefined {
  if (!trimToEmpty(value)) {
    return `${label} is required`;
  }

  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const trimmed = trimToEmpty(value);
  if (!trimmed) {
    return 'Email is required';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address';
  }

  if (trimmed.length > 320) {
    return 'Email must be 320 characters or fewer';
  }

  return undefined;
}

export function validatePassword(value: string, label = 'Password'): string | undefined {
  const trimmed = value;
  if (!trimmed) {
    return `${label} is required`;
  }

  if (trimmed.length < 8) {
    return `${label} must be at least 8 characters`;
  }

  if (trimmed.length > 128) {
    return `${label} must be 128 characters or fewer`;
  }

  return undefined;
}

export function validateOrganizationCode(value: string): string | undefined {
  const normalized = normalizeOrganizationCodeInput(value);
  if (!normalized) {
    return 'Organization code is required';
  }

  if (!isValidOrganizationCodeInput(normalized)) {
    return 'Organization code must be 3–64 lowercase letters, numbers, or hyphens';
  }

  return undefined;
}

export function validateOrganizationName(value: string): string | undefined {
  const trimmed = trimToEmpty(value);
  if (!trimmed) {
    return 'School name is required';
  }

  if (trimmed.length > 200) {
    return 'School name must be 200 characters or fewer';
  }

  return undefined;
}

export function validateOptionalPhone(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return 'Enter a valid phone number (10–15 digits)';
  }

  return undefined;
}

export function validateOptionalPinCode(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  if (!/^\d{6}$/.test(value.trim())) {
    return 'PIN code must be 6 digits';
  }

  return undefined;
}

export function validateOptionalUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Website must start with http:// or https://';
    }
  } catch {
    return 'Enter a valid website URL';
  }

  return undefined;
}

export function mapApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
