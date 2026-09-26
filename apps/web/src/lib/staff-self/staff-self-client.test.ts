import { describe, expect, it } from 'vitest';
import { formatStaffDisplayName } from '@/lib/staff-self/staff-self-client';

describe('staff-self-client', () => {
  it('formats staff display name from profile', () => {
    expect(
      formatStaffDisplayName({
        id: '1',
        employeeCode: 'E1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        displayName: null,
        departmentName: null,
      }),
    ).toBe('Ada Lovelace');
  });
});
