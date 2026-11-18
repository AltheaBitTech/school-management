import { InstitutionType } from '@prisma/client';
import { DEFAULT_TERMINOLOGY, resolveTerminology } from './terminology';

describe('resolveTerminology', () => {
  it('returns school vocabulary by default', () => {
    expect(resolveTerminology(undefined)).toEqual(DEFAULT_TERMINOLOGY.SCHOOL);
  });

  it('returns college and institute vocabulary', () => {
    expect(resolveTerminology(InstitutionType.COLLEGE).unit).toBe('Program');
    expect(resolveTerminology(InstitutionType.COLLEGE).term).toBe('Semester');
    expect(resolveTerminology(InstitutionType.INSTITUTE).group).toBe('Batch');
  });

  it('applies valid overrides and ignores invalid ones', () => {
    const result = resolveTerminology(InstitutionType.COLLEGE, {
      group: '  Batch ',
      unit: '',
      head: 42,
      unknownKey: 'x',
      term: 'x'.repeat(61),
    });
    expect(result.group).toBe('Batch');
    expect(result.unit).toBe('Program');
    expect(result.head).toBe('Principal / Dean');
    expect(result.term).toBe('Semester');
    expect(result).not.toHaveProperty('unknownKey');
  });

  it('ignores non-object overrides', () => {
    expect(resolveTerminology(InstitutionType.SCHOOL, ['x'])).toEqual(DEFAULT_TERMINOLOGY.SCHOOL);
  });
});
