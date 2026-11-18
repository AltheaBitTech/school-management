'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  formatEventDateTime,
  getEventDateRangeUtc,
  formatEventStatus,
  formatEventType,
  listEvents,
  listVenues,
  type CampusEvent,
  type EventStatus,
  type EventType,
  type Venue,
} from '@/lib/events/events-client';
import { getCurrentOrganization } from '@/lib/organizations/organizations-client';

export default function EventsPage() {
  const canCreate = useCan('event.create');
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [type, setType] = useState<EventType | ''>('');
  const [venueId, setVenueId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [organizationTimezone, setOrganizationTimezone] = useState('UTC');

  function isForbiddenError(error: unknown): boolean {
    return error instanceof ApiError || (typeof error === 'object' && error !== null && 'statusCode' in error)
      ? (error as { statusCode?: number }).statusCode === 403
      : false;
  }

  useEffect(() => {
    void Promise.all([listVenues({ active: true }), getCurrentOrganization()])
      .then(([venueResponse, organization]) => {
        setVenues(venueResponse.data);
        setOrganizationTimezone(organization.timezone);
        setVenueError(null);
      })
      .catch((error) => setVenueError(error instanceof Error ? error.message : 'Failed to load venues'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      const dateRange = getEventDateRangeUtc(fromDate || undefined, toDate || undefined, organizationTimezone);
      try {
        const response = await listEvents({
          page: 1,
          pageSize: 50,
          status: status || undefined,
          type: type || undefined,
          venueId: venueId || undefined,
          ...dateRange,
        });
        if (!cancelled) setEvents(response.data);
      } catch (error) {
        if (cancelled) return;
        if (isForbiddenError(error)) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Failed to load events');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [fromDate, organizationTimezone, status, toDate, type, venueId]);

  if (isForbidden) return <ForbiddenState />;

  return (
    <ListPageShell
      title="Events"
      description="Plan events in a date-aware operational calendar."
      icon={EventOutlined}
      actions={
        canCreate ? (
          <Button component={Link} href="/events/new" variant="contained" startIcon={<AddOutlined />}>
            New event
          </Button>
        ) : undefined
      }
      filters={
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
        <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value as EventStatus | '')} sx={{ minWidth: 170 }}>
          <MenuItem value="">All statuses</MenuItem>
          {EVENT_STATUSES.map((item) => <MenuItem key={item} value={item}>{formatEventStatus(item)}</MenuItem>)}
        </TextField>
        <TextField select label="Type" value={type} onChange={(event) => setType(event.target.value as EventType | '')} sx={{ minWidth: 170 }}>
          <MenuItem value="">All types</MenuItem>
          {EVENT_TYPES.map((item) => <MenuItem key={item} value={item}>{formatEventType(item)}</MenuItem>)}
        </TextField>
        <TextField select label="Venue" value={venueId} onChange={(event) => setVenueId(event.target.value)} sx={{ minWidth: 210 }}>
          <MenuItem value="">All venues</MenuItem>
          {venues.map((venue) => <MenuItem key={venue.id} value={venue.id}>{venue.name}</MenuItem>)}
        </TextField>
        <TextField label="From" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="To" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>
      }
    >
      {errorMessage && !isLoading ? <Alert severity="error">{errorMessage}</Alert> : null}
      {venueError ? <Alert severity="warning">{venueError}. Venue filtering is unavailable.</Alert> : null}
      {isLoading ? <LoadingState label="Loading events" columnCount={5} /> : null}
      {!isLoading && events.length === 0 ? (
        <EmptyState
          icon={EventOutlined}
          message={
            canCreate
              ? 'No events match the selected filters.'
              : 'No events match the selected filters. Creating an event is not part of this role.'
          }
          action={
            canCreate ? (
              <Button component={Link} href="/events/new" variant="contained" startIcon={<AddOutlined />}>
                New event
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {!isLoading && events.length > 0 ? (
        <AppTable aria-label="Events">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>When</TableCell>
              <TableCell>Venue</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} hover>
                <TableCell>
                  <Button component={Link} href={`/events/${event.id}`} size="small">
                    {event.title}
                  </Button>
                </TableCell>
                <TableCell>{formatEventType(event.type)}</TableCell>
                <TableCell>{formatEventDateTime(event.startAt, organizationTimezone)}</TableCell>
                <TableCell>{event.venue.name}</TableCell>
                <TableCell>
                  <StatusChip status={event.status} label={formatEventStatus(event.status)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </ListPageShell>
  );
}
