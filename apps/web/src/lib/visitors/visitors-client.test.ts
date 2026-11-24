import { describe, expect, it } from 'vitest';
import { formatVisitDuration } from '@/lib/visitors/visitors-client';

describe('formatVisitDuration', () => {
  const start = '2026-11-24T09:00:00.000Z';

  it('formats minutes, hours and days', () => {
    expect(formatVisitDuration(start, '2026-11-24T09:45:00.000Z')).toBe('45m');
    expect(formatVisitDuration(start, '2026-11-24T10:25:00.000Z')).toBe('1h 25m');
    expect(formatVisitDuration(start, '2026-11-24T11:00:00.000Z')).toBe('2h');
    expect(formatVisitDuration(start, '2026-11-26T12:00:00.000Z')).toBe('2d 3h');
  });

  it('handles very short and invalid ranges', () => {
    expect(formatVisitDuration(start, '2026-11-24T09:00:20.000Z')).toBe('under a minute');
    expect(formatVisitDuration(start, '2026-11-24T08:00:00.000Z')).toBeNull();
    expect(formatVisitDuration('not-a-date', start)).toBeNull();
  });
});
