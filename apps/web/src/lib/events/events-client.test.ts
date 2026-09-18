import { describe, expect, it } from 'vitest';
import {
  formatEventDateTime,
  fromDateTimeInputValue,
  getEventDateRangeUtc,
  toDateTimeInputValue,
} from '@/lib/events/events-client';

describe('Event timezone helpers', () => {
  it('interprets a datetime input in the organization timezone and preserves the instant', () => {
    const instant = fromDateTimeInputValue('2026-09-18T00:15', 'Asia/Kolkata');

    expect(instant).toBe('2026-09-17T18:45:00.000Z');
    expect(toDateTimeInputValue(instant, 'Asia/Kolkata')).toBe('2026-09-18T00:15');
    expect(formatEventDateTime(instant, 'Asia/Kolkata')).toContain('18');
  });

  it('builds organization-local calendar date boundaries', () => {
    expect(getEventDateRangeUtc('2026-09-18', '2026-09-18', 'Asia/Kolkata')).toEqual({
      fromDate: '2026-09-17T18:30:00.000Z',
      toDate: '2026-09-18T18:30:00.000Z',
    });
  });
});
