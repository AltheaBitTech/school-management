import { isValidOrganizationCode, normalizeOrganizationCode } from './organization-code.util';

describe('organization code utilities', () => {
  it('normalizes organization codes by trimming and lowercasing', () => {
    expect(normalizeOrganizationCode('  Greenwood-High  ')).toBe('greenwood-high');
  });

  it('accepts valid organization codes', () => {
    expect(isValidOrganizationCode('greenwood-high')).toBe(true);
    expect(isValidOrganizationCode('school123')).toBe(true);
  });

  it('rejects invalid organization codes', () => {
    expect(isValidOrganizationCode('ab')).toBe(false);
    expect(isValidOrganizationCode('Invalid Code')).toBe(false);
    expect(isValidOrganizationCode('school_code')).toBe(false);
  });
});
