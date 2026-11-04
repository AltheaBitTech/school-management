import { apiClient } from '@/lib/api/client';

export interface CalendarLeaveItem {
  id: string;
  type: 'leave';
  title: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface CalendarEventItem {
  id: string;
  type: 'event';
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  venueName: string | null;
}

export interface CalendarData {
  startDate: string;
  endDate: string;
  leave: CalendarLeaveItem[];
  events: CalendarEventItem[];
}

interface CalendarResponse {
  data: CalendarData;
}

export async function getCalendarItems(startDate: string, endDate: string): Promise<CalendarData> {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await apiClient.get<CalendarResponse>(`/calendar?${params.toString()}`, {
    auth: true,
  });
  return response.data;
}
