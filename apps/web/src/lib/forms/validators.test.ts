import { describe, expect, it } from 'vitest';
import {
  mapApiErrorMessage,
  mapApiFieldErrors,
  trimToEmpty,
  validateEmail,
  validateOptionalIndianMobile,
  validateOptionalPinCode,
  validateOrganizationCode,
  validateOrganizationName,
  validateConfirmPassword,
  validateDateRange,
  validateDepartmentCode,
  validateOptionalTimeHHMM,
  validatePassword,
  validatePositiveAmount,
  validateRequiredMaxLength,
  validateRequiredMinMaxLength,
} from './validators';

describe('form validators', () => {
  it('validates organization codes using the same rules as the API', () => {
    expect(validateOrganizationCode('  GREENWOOD-HIGH  ')).toBeUndefined();
    expect(validateOrganizationCode('ab')).toMatch(/3–64/);
    expect(validateOrganizationCode('')).toMatch(/required/i);
  });

  it('validates admin credentials for create-school flows', () => {
    expect(validateOrganizationName('Greenwood High')).toBeUndefined();
    expect(validateEmail('admin@school.example')).toBeUndefined();
    expect(validateEmail(`${'a'.repeat(250)}@b.co`)).toMatch(/254/);
    expect(validatePassword('short')).toMatch(/at least 8/);
  });

  it('accepts a blank staff mobile and rejects a short one', () => {
    expect(validateOptionalIndianMobile('')).toBeUndefined();
    expect(validateOptionalIndianMobile('9876543210')).toBeUndefined();
    expect(validateOptionalIndianMobile('123')).toMatch(/10-digit/);
  });

  it('maps API messages that start with a field name', () => {
    expect(mapApiFieldErrors('email must be an email; mobile must be a 10-digit Indian mobile number', ['email', 'mobile'])).toEqual({
      email: 'email must be an email',
      mobile: 'mobile must be a 10-digit Indian mobile number',
    });
    expect(mapApiErrorMessage(new Error('Saved'), 'Failed')).toBe('Saved');
    expect(trimToEmpty('  Priya  ')).toBe('Priya');
  });

  it('validates department codes and transport times', () => {
    expect(validateDepartmentCode('teaching')).toBeUndefined();
    expect(validateDepartmentCode('x')).toMatch(/2–32/);
    expect(validateRequiredMinMaxLength('ab', 'Name', 2, 80)).toBeUndefined();
    expect(validateRequiredMinMaxLength('a', 'Name', 2, 80)).toMatch(/at least 2/);
    expect(validateOptionalTimeHHMM('07:30')).toBeUndefined();
    expect(validateOptionalTimeHHMM('7:30')).toMatch(/24-hour/);
  });

  it('validates password confirmation and date ranges', () => {
    expect(validateConfirmPassword('Password123!', 'Password123!')).toBeUndefined();
    expect(validateConfirmPassword('Password123!', 'x')).toMatch(/do not match/);
    expect(validateDateRange('2026-01-10', '2026-01-09')).toMatch(/on or after/);
    expect(validateDateRange('2026-01-10', '2026-01-10')).toBeUndefined();
    expect(validatePositiveAmount('12.5')).toBeUndefined();
    expect(validatePositiveAmount('0')).toMatch(/0.01/);
    expect(validateRequiredMaxLength('ab', 'Title', 200)).toBeUndefined();
    expect(validateRequiredMaxLength('', 'Title', 200)).toMatch(/required/);
  });

  it('validates optional address helpers without forcing values', () => {
    expect(validateOptionalPinCode(undefined)).toBeUndefined();
    expect(validateOptionalPinCode('560001')).toBeUndefined();
    expect(validateOptionalPinCode('5600')).toMatch(/6 digits/);
  });
});
