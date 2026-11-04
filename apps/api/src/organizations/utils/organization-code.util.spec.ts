import {
  buildOrganizationCodeCandidates,
  isValidOrganizationCode,
  normalizeOrganizationCode,
  slugifyOrganizationName,
} from './organization-code.util';

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

  it('slugifies school names into login-friendly codes', () => {
    expect(slugifyOrganizationName('Delhi Public School')).toBe('delhi-public-school');
    expect(slugifyOrganizationName('Myari Public School')).toBe('myari-public-school');
    expect(slugifyOrganizationName('  Green   Valley  ')).toBe('green-valley');
  });

  it('builds candidate list with preferred code first', () => {
    const candidates = buildOrganizationCodeCandidates('Delhi Public School', 'dps-delhi');
    expect(candidates[0]).toBe('dps-delhi');
    expect(candidates).toContain('delhi-public-school');
  });
});
