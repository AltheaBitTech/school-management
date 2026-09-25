import { isValidTimezone } from './timezone.util';

describe('isValidTimezone', () => {
  it('accepts valid IANA timezones', () => {
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
  });

  it('rejects invalid timezones', () => {
    expect(isValidTimezone('Not/A_Timezone')).toBe(false);
  });
});
