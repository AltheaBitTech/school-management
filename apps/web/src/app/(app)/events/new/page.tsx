'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  createEvent,
  EVENT_TYPES,
  fromDateTimeInputValue,
  formatEventType,
  listVenues,
  type EventType,
  type Venue,
} from '@/lib/events/events-client';
import { getCurrentOrganization } from '@/lib/organizations/organizations-client';

export default function NewEventPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('MEETING');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [venueId, setVenueId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [organizationTimezone, setOrganizationTimezone] = useState('UTC');

  useEffect(() => {
    void Promise.all([listVenues({ active: true }), getCurrentOrganization()]).then(([response, organization]) => {
      setVenues(response.data);
      setOrganizationTimezone(organization.timezone);
    }).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load venues');
    }).finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const created = await createEvent({
        title,
        description: description || undefined,
        type,
        startAt: fromDateTimeInputValue(startAt, organizationTimezone),
        endAt: fromDateTimeInputValue(endAt, organizationTimezone),
        venueId,
      });
      router.push(`/events/${created.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
      else setErrorMessage(error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) return <ForbiddenState />;

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Box><Typography variant="h4" component="h1">Create event</Typography><Typography color="text.secondary">Add a scheduled school event and assign its venue.</Typography></Box>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <Stack spacing={2} maxWidth="sm">
        <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <TextField select label="Event type" value={type} onChange={(event) => setType(event.target.value as EventType)} required>
          {EVENT_TYPES.map((item) => <MenuItem key={item} value={item}>{formatEventType(item)}</MenuItem>)}
        </TextField>
        <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={3} />
        <TextField label="Starts" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} InputLabelProps={{ shrink: true }} required />
        <TextField label="Ends" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} InputLabelProps={{ shrink: true }} required />
        <TextField select label="Venue" value={venueId} onChange={(event) => setVenueId(event.target.value)} required disabled={isLoading}>
          {venues.map((venue) => <MenuItem key={venue.id} value={venue.id}>{venue.name}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={2}><Button component="a" href="/events">Cancel</Button><Button type="submit" variant="contained" disabled={isSubmitting || isLoading}>{isSubmitting ? 'Creating...' : 'Create event'}</Button></Stack>
      </Stack>
    </Stack>
  );
}
