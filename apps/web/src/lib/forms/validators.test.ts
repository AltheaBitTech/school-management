import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validateOrganizationCode,
  validateOrganizationName,
  validateOptionalPinCode,
  validatePassword,
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
    expect(validatePassword('short')).toMatch(/at least 8/);
  });

  it('validates optional address helpers without forcing values', () => {
    expect(validateOptionalPinCode(undefined)).toBeUndefined();
    expect(validateOptionalPinCode('560001')).toBeUndefined();
    expect(validateOptionalPinCode('5600')).toMatch(/6 digits/);
  });
});
