import { describe, expect, it } from 'vitest';
import { formatDashboardDate, getGreetingLabel } from '@/lib/dashboard/dashboard-client';

describe('dashboard-client', () => {
  it('returns greeting labels', () => {
    expect(getGreetingLabel('morning')).toBe('Good morning');
    expect(getGreetingLabel('evening')).toBe('Good evening');
  });

  it('formats dashboard dates', () => {
    expect(formatDashboardDate('2026-09-25', 'UTC')).toContain('2026');
  });
});
