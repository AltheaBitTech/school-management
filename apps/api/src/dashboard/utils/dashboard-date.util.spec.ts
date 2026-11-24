import {
  getGreetingPeriod,
  getLocalDateString,
  getLocalDayUtcRange,
} from './dashboard-date.util';

describe('dashboard-date.util', () => {
  it('formats local date in organization timezone', () => {
    const date = new Date('2026-09-25T20:30:00.000Z');
    expect(getLocalDateString('Asia/Kolkata', date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns greeting period based on local hour', () => {
    expect(getGreetingPeriod('UTC', new Date('2026-09-25T08:00:00.000Z'))).toBe('morning');
    expect(getGreetingPeriod('UTC', new Date('2026-09-25T14:00:00.000Z'))).toBe('afternoon');
    expect(getGreetingPeriod('UTC', new Date('2026-09-25T20:00:00.000Z'))).toBe('evening');
  });

  it('falls back to UTC when the timezone is not valid', () => {
    const date = new Date('2026-09-25T00:30:00.000Z');
    expect(getLocalDateString('Not/AZone', date)).toBe('2026-09-25');
  });

  it('builds UTC range for a local calendar day', () => {
    const range = getLocalDayUtcRange('2026-09-25', 'UTC');
    expect(range.startUtc.toISOString()).toBe('2026-09-25T00:00:00.000Z');
    expect(range.endUtc.toISOString()).toBe('2026-09-26T00:00:00.000Z');
  });
});
