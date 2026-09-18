import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EventDetailPage from '@/app/(app)/events/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'event-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api/client', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('@/lib/events/events-client', () => ({
  getEvent: vi.fn().mockResolvedValue({
    id: 'event-1',
    title: 'Read-only event',
    description: null,
    type: 'MEETING',
    status: 'SCHEDULED',
    startAt: '2026-10-01T10:00:00.000Z',
    endAt: '2026-10-01T11:00:00.000Z',
    venueId: 'venue-1',
    createdByUserId: 'user-1',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    archivedAt: null,
    cancelledAt: null,
    completedAt: null,
    venue: { id: 'venue-1', name: 'Main Hall', location: null, capacity: 100, active: true },
    participants: [],
  }),
  scheduleEvent: vi.fn(),
  cancelEvent: vi.fn(),
  completeEvent: vi.fn(),
  archiveEvent: vi.fn(),
  addEventParticipant: vi.fn(),
  removeEventParticipant: vi.fn(),
  formatEventDateTime: (value: string) => value,
  formatEventStatus: (value: string) => value,
  formatEventType: (value: string) => value,
}));

vi.mock('@/lib/organizations/organizations-client', () => ({
  getCurrentOrganization: vi.fn().mockResolvedValue({ timezone: 'Asia/Kolkata' }),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden' }),
  getStaffDisplayName: (value: { firstName: string; lastName: string }) => `${value.firstName} ${value.lastName}`,
}));

vi.mock('@/lib/students/students-client', () => ({
  listStudents: vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden' }),
  getStudentDisplayName: (value: { firstName: string; lastName: string }) => `${value.firstName} ${value.lastName}`,
}));

describe('EventDetailPage', () => {
  it('renders for an Event viewer when participant directories are forbidden', async () => {
    render(<EventDetailPage />);

    await waitFor(() => expect(screen.getByText('Read-only event')).toBeInTheDocument());
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
  });
});
