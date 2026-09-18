'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
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
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">Events</Typography>
          <Typography color="text.secondary">Plan school events in a date-aware operational calendar.</Typography>
        </Box>
        <Button component={Link} href="/events/new" variant="contained">New event</Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {venueError && <Alert severity="warning">{venueError}. Venue filtering is unavailable.</Alert>}
      {isLoading ? <CircularProgress /> : events.length === 0 ? (
        <Alert severity="info">No events match the selected filters.</Alert>
      ) : (
        <Table size="small">
          <TableHead><TableRow><TableCell>Event</TableCell><TableCell>Type</TableCell><TableCell>When</TableCell><TableCell>Venue</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} hover>
                <TableCell><Link href={`/events/${event.id}`}>{event.title}</Link></TableCell>
                <TableCell>{formatEventType(event.type)}</TableCell>
                <TableCell>{formatEventDateTime(event.startAt, organizationTimezone)}</TableCell>
                <TableCell>{event.venue.name}</TableCell>
                <TableCell><Chip size="small" label={formatEventStatus(event.status)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
