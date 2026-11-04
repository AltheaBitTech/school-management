import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import CalendarPage from '@/app/(app)/calendar/page';
import { renderWithAppProviders } from '@/test/render-app';

vi.mock('@/lib/calendar/calendar-client', () => ({
  getCalendarItems: vi.fn(),
}));

vi.mock('@/lib/events/events-client', () => ({
  formatEventDateTime: (value: string) => value,
}));

import { getCalendarItems } from '@/lib/calendar/calendar-client';

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.mocked(getCalendarItems).mockReset();
  });

  it('shows the month grid and an event that falls in the loaded month', async () => {
    vi.mocked(getCalendarItems).mockResolvedValue({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      leave: [],
      events: [
        {
          id: 'event-1',
          type: 'event',
          title: 'Annual day',
          status: 'SCHEDULED',
          startAt: '2026-11-12T09:00:00.000Z',
          endAt: '2026-11-12T12:00:00.000Z',
          venueName: 'Hall',
        },
      ],
    });

    renderWithAppProviders(<CalendarPage />);

    expect(screen.getByRole('heading', { name: 'Operations calendar' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'November 2026 calendar' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Annual day/).length).toBeGreaterThan(0);
    });
  });

  it('loads the previous month when the month control is used', async () => {
    vi.mocked(getCalendarItems).mockResolvedValue({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      leave: [],
      events: [],
    });

    renderWithAppProviders(<CalendarPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    await waitFor(() => {
      const calls = vi.mocked(getCalendarItems).mock.calls;
      const firstStart = calls[0]?.[0];
      const lastStart = calls.at(-1)?.[0];
      expect(lastStart && firstStart && lastStart < firstStart).toBe(true);
    });
  });
});
