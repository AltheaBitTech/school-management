import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EventsPage from '@/app/(app)/events/page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/events/events-client', () => ({
  listEvents: vi.fn(),
  listVenues: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }),
  EVENT_STATUSES: ['DRAFT', 'SCHEDULED', 'COMPLETED', 'ARCHIVED', 'CANCELLED'],
  EVENT_TYPES: ['SPORTS_DAY', 'PTM', 'HOLIDAY', 'EXAMINATION', 'MEETING', 'ANNUAL_DAY'],
  formatEventStatus: (status: string) => status,
  formatEventType: (type: string) => type,
  formatEventDateTime: (value: string) => value,
  getEventDateRangeUtc: (fromDate?: string, toDate?: string) => ({ fromDate, toDate }),
}));

vi.mock('@/lib/organizations/organizations-client', () => ({
  getCurrentOrganization: vi.fn().mockResolvedValue({ timezone: 'UTC' }),
}));

import { listEvents } from '@/lib/events/events-client';

describe('EventsPage', () => {
  beforeEach(() => vi.mocked(listEvents).mockReset());

  it('renders event rows and an empty state', async () => {
    vi.mocked(listEvents).mockResolvedValue({
      data: [{
        id: 'event-1', title: 'Sports Day', description: null, type: 'SPORTS_DAY', status: 'SCHEDULED',
        startAt: '2026-10-01T10:00:00.000Z', endAt: '2026-10-01T12:00:00.000Z', venueId: 'venue-1',
        createdByUserId: 'user-1', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
        archivedAt: null, cancelledAt: null, completedAt: null,
        venue: { id: 'venue-1', name: 'Ground', location: null, capacity: 500, active: true }, participants: [],
      }],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });
    render(<EventsPage />);
    await waitFor(() => expect(screen.getByText('Sports Day')).toBeInTheDocument());

    vi.mocked(listEvents).mockResolvedValue({ data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } });
    render(<EventsPage />);
    await waitFor(() => expect(screen.getByText(/No events match/i)).toBeInTheDocument());
  });

});
