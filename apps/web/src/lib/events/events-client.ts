import { apiClient, apiRequest } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type EventType = 'SPORTS_DAY' | 'PTM' | 'HOLIDAY' | 'EXAMINATION' | 'MEETING' | 'ANNUAL_DAY';
export type EventStatus = 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED';
export type EventParticipantType = 'STAFF' | 'STUDENT';

export interface Venue {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  active: boolean;
}

export interface EventParticipant {
  id: string;
  participantType: EventParticipantType;
  participantId: string;
  createdAt: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  status: EventStatus;
  startAt: string;
  endAt: string;
  venueId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  venue: Venue;
  participants: EventParticipant[];
}

interface EventResponse { data: CampusEvent }
interface VenueResponse { data: Venue }
interface PaginatedEventsResponse { data: CampusEvent[]; meta: PaginationMeta }
interface PaginatedVenuesResponse { data: Venue[]; meta: PaginationMeta }

export const EVENT_TYPES: EventType[] = ['SPORTS_DAY', 'PTM', 'HOLIDAY', 'EXAMINATION', 'MEETING', 'ANNUAL_DAY'];
export const EVENT_STATUSES: EventStatus[] = ['DRAFT', 'SCHEDULED', 'COMPLETED', 'ARCHIVED', 'CANCELLED'];

export async function listEvents(params?: {
  page?: number;
  pageSize?: number;
  status?: EventStatus;
  type?: EventType;
  venueId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PaginatedEventsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);
  if (params?.venueId) query.set('venueId', params.venueId);
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<PaginatedEventsResponse>(`/events${suffix}`, { auth: true });
}

export async function getEvent(id: string): Promise<CampusEvent> {
  const response = await apiClient.get<EventResponse>(`/events/${id}`, { auth: true });
  return response.data;
}

export async function createEvent(payload: {
  title: string;
  description?: string;
  type: EventType;
  startAt: string;
  endAt: string;
  venueId: string;
}): Promise<CampusEvent> {
  const response = await apiClient.post<EventResponse>('/events', payload, { auth: true });
  return response.data;
}

export async function updateEvent(id: string, payload: Partial<{
  title: string;
  description: string;
  type: EventType;
  startAt: string;
  endAt: string;
  venueId: string;
}>): Promise<CampusEvent> {
  const response = await apiClient.patch<EventResponse>(`/events/${id}`, payload, { auth: true });
  return response.data;
}

export async function cancelEvent(id: string): Promise<CampusEvent> {
  const response = await apiClient.post<EventResponse>(`/events/${id}/cancel`, {}, { auth: true });
  return response.data;
}

export async function scheduleEvent(id: string): Promise<CampusEvent> {
  const response = await apiClient.post<EventResponse>(`/events/${id}/schedule`, {}, { auth: true });
  return response.data;
}

export async function completeEvent(id: string): Promise<CampusEvent> {
  const response = await apiClient.post<EventResponse>(`/events/${id}/complete`, {}, { auth: true });
  return response.data;
}

export async function archiveEvent(id: string): Promise<CampusEvent> {
  const response = await apiClient.post<EventResponse>(`/events/${id}/archive`, {}, { auth: true });
  return response.data;
}

export async function listVenues(params?: { active?: boolean; pageSize?: number }): Promise<PaginatedVenuesResponse> {
  const query = new URLSearchParams({ page: '1', pageSize: String(params?.pageSize ?? 100) });
  if (params?.active !== undefined) query.set('active', String(params.active));
  return apiClient.get<PaginatedVenuesResponse>(`/venues?${query.toString()}`, { auth: true });
}

export async function createVenue(payload: { name: string; location?: string; capacity?: number }): Promise<Venue> {
  const response = await apiClient.post<VenueResponse>('/venues', payload, { auth: true });
  return response.data;
}

export async function updateVenue(id: string, payload: { name?: string; location?: string | null; capacity?: number | null; active?: boolean }): Promise<Venue> {
  const response = await apiClient.patch<VenueResponse>(`/venues/${id}`, payload, { auth: true });
  return response.data;
}

export async function listEventParticipants(id: string): Promise<{ data: EventParticipant[] }> {
  return apiClient.get<{ data: EventParticipant[] }>(`/events/${id}/participants`, { auth: true });
}

export async function addEventParticipant(id: string, payload: { participantType: EventParticipantType; participantId: string }): Promise<EventParticipant> {
  const response = await apiClient.post<{ data: EventParticipant }>(`/events/${id}/participants`, payload, { auth: true });
  return response.data;
}

export async function removeEventParticipant(eventId: string, participantId: string): Promise<void> {
  await apiRequest(`/events/${eventId}/participants/${participantId}`, { method: 'DELETE', auth: true });
}

export function formatEventType(type: EventType): string {
  return type.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function formatEventStatus(status: EventStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatEventDateTime(value: string, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function getZonedDateTimeParts(value: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
}

function parseDateTimeInput(value: string): number[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error('Invalid event datetime input');
  }
  return match.slice(1).map(Number);
}

export function fromDateTimeInputValue(value: string, timeZone: string): string {
  const [year, month, day, hour, minute] = parseDateTimeInput(value);
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedDateTimeParts(new Date(timestamp), timeZone);
    const interpreted = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const requested = Date.UTC(year, month - 1, day, hour, minute);
    timestamp += requested - interpreted;
  }

  return new Date(timestamp).toISOString();
}

export function toDateTimeInputValue(value: string, timeZone: string): string {
  const parts = getZonedDateTimeParts(new Date(value), timeZone);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function addCalendarDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

export function getEventDateRangeUtc(
  fromDate: string | undefined,
  toDate: string | undefined,
  timeZone: string,
): { fromDate?: string; toDate?: string } {
  return {
    ...(fromDate ? { fromDate: fromDateTimeInputValue(`${fromDate}T00:00`, timeZone) } : {}),
    ...(toDate ? { toDate: fromDateTimeInputValue(`${addCalendarDay(toDate)}T00:00`, timeZone) } : {}),
  };
}
