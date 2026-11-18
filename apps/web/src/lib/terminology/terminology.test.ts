import { describe, expect, it } from 'vitest';
import { DEFAULT_TERMINOLOGY, roleDisplayName, usesTerms } from './terminology';

describe('terminology', () => {
  it('maps institution types to vocabulary', () => {
    expect(DEFAULT_TERMINOLOGY.SCHOOL.unit).toBe('Class');
    expect(DEFAULT_TERMINOLOGY.COLLEGE.unit).toBe('Program');
    expect(DEFAULT_TERMINOLOGY.INSTITUTE.group).toBe('Batch');
  });

  it('only colleges and institutes use terms', () => {
    expect(usesTerms('SCHOOL')).toBe(false);
    expect(usesTerms('COLLEGE')).toBe(true);
    expect(usesTerms('INSTITUTE')).toBe(true);
  });

  it('relabels admin and head roles', () => {
    expect(roleDisplayName('SCHOOL_ADMIN', 'School Admin', DEFAULT_TERMINOLOGY.COLLEGE)).toBe('College Admin');
    expect(roleDisplayName('PRINCIPAL', 'Principal', DEFAULT_TERMINOLOGY.INSTITUTE)).toBe('Director');
    expect(roleDisplayName('TEACHER', 'Teacher', DEFAULT_TERMINOLOGY.COLLEGE)).toBe('Teacher');
  });
});
