import { isValidOrganizationCodeInput, normalizeOrganizationCodeInput } from '@/lib/organizations/organization-code';

export function trimToEmpty(value: string): string {
  return value.trim();
}

export function validateEmployeeCode(value: string): string | undefined {
  const trimmed = trimToEmpty(value).toLowerCase();
  if (!trimmed) {
    return 'Employee code is required';
  }

  if (!/^[a-z0-9-]{2,32}$/.test(trimmed)) {
    return 'Employee code must be 2-32 lowercase letters, numbers, or hyphens';
  }

  return undefined;
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

  if (trimmed.length > 254) {
    return 'Email must be 254 characters or fewer';
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
    return 'Institution name is required';
  }

  if (trimmed.length > 200) {
    return 'Institution name must be 200 characters or fewer';
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

export function validateOptionalIndianMobile(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return undefined;
  }

  if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(trimmed)) {
    return 'Enter a 10-digit Indian mobile number';
  }

  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (confirmPassword !== password) {
    return 'Passwords do not match';
  }
  return undefined;
}

export function validateRequiredMaxLength(
  value: string,
  label: string,
  maxLength: number,
): string | undefined {
  const required = validateRequired(value, label);
  if (required) {
    return required;
  }
  if (trimToEmpty(value).length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer`;
  }
  return undefined;
}

/** ISO date strings (YYYY-MM-DD). End must be on or after start. */
export function validateDateRange(start: string, end: string): string | undefined {
  if (!start || !end) {
    return 'Start and end dates are required';
  }
  if (end < start) {
    return 'End date must be on or after start date';
  }
  return undefined;
}

export function validateRequiredMinMaxLength(
  value: string,
  label: string,
  minLength: number,
  maxLength: number,
): string | undefined {
  const required = validateRequired(value, label);
  if (required) {
    return required;
  }
  const len = trimToEmpty(value).length;
  if (len < minLength) {
    return `${label} must be at least ${minLength} characters`;
  }
  if (len > maxLength) {
    return `${label} must be ${maxLength} characters or fewer`;
  }
  return undefined;
}

export function validateOptionalMaxLength(
  value: string,
  label: string,
  maxLength: number,
): string | undefined {
  const trimmed = trimToEmpty(value);
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer`;
  }
  return undefined;
}

export function validateOptionalNonNegativeAmount(value: string, label = 'Amount'): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const num = Number(trimmed);
  if (Number.isNaN(num) || num < 0) {
    return `${label} must be zero or greater`;
  }
  const decimals = trimmed.includes('.') ? trimmed.split('.')[1]?.length ?? 0 : 0;
  if (decimals > 2) {
    return `${label} must have at most 2 decimal places`;
  }
  return undefined;
}

export function validateDepartmentCode(value: string): string | undefined {
  const normalized = trimToEmpty(value).toLowerCase();
  if (!normalized) {
    return 'Department code is required';
  }
  if (!/^[a-z0-9-]{2,32}$/.test(normalized)) {
    return 'Department code must be 2–32 lowercase letters, numbers, or hyphens';
  }
  return undefined;
}

/** Optional pickup / schedule time in HH:MM (24-hour). */
export function validateOptionalTimeHHMM(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    return 'Use 24-hour time like 07:30';
  }
  return undefined;
}

export function validatePositiveAmount(value: string, label = 'Amount'): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${label} is required`;
  }
  const num = Number(trimmed);
  if (Number.isNaN(num) || num < 0.01) {
    return `${label} must be at least 0.01`;
  }
  const decimals = trimmed.includes('.') ? trimmed.split('.')[1]?.length ?? 0 : 0;
  if (decimals > 2) {
    return `${label} must have at most 2 decimal places`;
  }
  return undefined;
}

export function mapApiFieldErrors(
  message: string,
  fields: readonly string[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const part of message.split(';').map((item) => item.trim()).filter(Boolean)) {
    const match = fields.find((field) => part.toLowerCase().startsWith(field.toLowerCase()));
    if (match && !errors[match]) {
      errors[match] = part;
    }
  }
  return errors;
}

export function mapApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
