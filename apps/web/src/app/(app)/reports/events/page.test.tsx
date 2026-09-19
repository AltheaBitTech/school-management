import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EventReportPage from '@/app/(app)/reports/events/page';
import { isEventReportForbiddenError } from '@/lib/reports/event-report-errors';

vi.mock('@/lib/reports/event-reports-client', () => ({
  getEventReport: vi.fn(),
}));

vi.mock('@/lib/events/events-client', () => ({
  EVENT_STATUSES: ['DRAFT', 'SCHEDULED', 'COMPLETED', 'ARCHIVED', 'CANCELLED'],
  EVENT_TYPES: ['SPORTS_DAY', 'PTM', 'HOLIDAY', 'EXAMINATION', 'MEETING', 'ANNUAL_DAY'],
  formatEventDateTime: (value: string) => value,
  formatEventStatus: (value: string) => value,
  formatEventType: (value: string) => value,
  listVenues: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }),
}));

vi.mock('@/lib/organizations/organizations-client', () => ({
  getCurrentOrganization: vi.fn().mockResolvedValue({ timezone: 'Asia/Kolkata' }),
}));

import { getEventReport } from '@/lib/reports/event-reports-client';

describe('EventReportPage', () => {
  beforeEach(() => vi.mocked(getEventReport).mockReset());

  it('renders report rows and summary counts', async () => {
    vi.mocked(getEventReport).mockResolvedValue({
      data: [{
        id: 'event-1', title: 'Sports Day', type: 'SPORTS_DAY', status: 'SCHEDULED',
        startAt: '2026-09-18T06:00:00.000Z', endAt: '2026-09-18T08:00:00.000Z',
        venue: { id: 'venue-1', name: 'Ground' },
      }],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      summary: { total: 1, byStatus: { SCHEDULED: 1 } },
    });

    render(<EventReportPage />);
    await waitFor(() => expect(screen.getByText('Sports Day')).toBeInTheDocument());
    expect(screen.getByText('Total: 1')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED: 1')).toBeInTheDocument();
  });

  it('passes filters to the report client and renders empty state', async () => {
    vi.mocked(getEventReport).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      summary: { total: 0, byStatus: {} },
    });

    render(<EventReportPage />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-18' } });
    await waitFor(() => expect(screen.getByText(/No events match/i)).toBeInTheDocument());
    expect(vi.mocked(getEventReport).mock.calls.at(-1)?.[0]).toMatchObject({ fromDate: '2026-09-18' });
  });

  it('recognizes a backend 403 response for forbidden-state handling', () => {
    expect(isEventReportForbiddenError({ statusCode: 403 })).toBe(true);
    expect(isEventReportForbiddenError({ statusCode: 401 })).toBe(false);
  });
});
