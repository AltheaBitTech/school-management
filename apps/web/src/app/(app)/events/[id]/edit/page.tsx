'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  EVENT_TYPES,
  fromDateTimeInputValue,
  formatEventType,
  getEvent,
  listVenues,
  toDateTimeInputValue,
  updateEvent,
  type CampusEvent,
  type EventType,
  type Venue,
} from '@/lib/events/events-client';
import { getCurrentOrganization } from '@/lib/organizations/organizations-client';

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<CampusEvent | null>(null);
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
    Promise.all([getEvent(params.id), listVenues({ active: true }), getCurrentOrganization()]).then(([data, venueResponse, organization]) => {
      setEvent(data); setVenues(venueResponse.data); setOrganizationTimezone(organization.timezone); setTitle(data.title); setDescription(data.description ?? ''); setType(data.type); setStartAt(toDateTimeInputValue(data.startAt, organization.timezone)); setEndAt(toDateTimeInputValue(data.endAt, organization.timezone)); setVenueId(data.venueId);
    }).catch((error) => {
      if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
      else setErrorMessage(error instanceof Error ? error.message : 'Failed to load event');
    }).finally(() => setIsLoading(false));
  }, [params.id]);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>): Promise<void> {
    formEvent.preventDefault();
    setIsSubmitting(true); setErrorMessage(null);
    try {
      await updateEvent(params.id, { title, description, type, startAt: fromDateTimeInputValue(startAt, organizationTimezone), endAt: fromDateTimeInputValue(endAt, organizationTimezone), venueId });
      router.push(`/events/${params.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
      else setErrorMessage(error instanceof Error ? error.message : 'Failed to update event');
    } finally { setIsSubmitting(false); }
  }

  if (isForbidden) return <ForbiddenState />;
  if (isLoading) return <Typography>Loading event...</Typography>;
  if (!event) return <Alert severity="error">{errorMessage ?? 'Event not found.'}</Alert>;
  if (event.status === 'ARCHIVED' || event.status === 'COMPLETED' || event.status === 'CANCELLED') return <Alert severity="warning">This event cannot be edited in its current state.</Alert>;

  return <Stack spacing={3} component="form" onSubmit={handleSubmit} maxWidth="sm"><Typography variant="h4" component="h1">Edit event</Typography>{errorMessage && <Alert severity="error">{errorMessage}</Alert>}<TextField label="Title" value={title} onChange={(input) => setTitle(input.target.value)} required /><TextField select label="Event type" value={type} onChange={(input) => setType(input.target.value as EventType)}>{EVENT_TYPES.map((item) => <MenuItem key={item} value={item}>{formatEventType(item)}</MenuItem>)}</TextField><TextField label="Description" value={description} onChange={(input) => setDescription(input.target.value)} multiline minRows={3} /><TextField label="Starts" type="datetime-local" value={startAt} onChange={(input) => setStartAt(input.target.value)} InputLabelProps={{ shrink: true }} required /><TextField label="Ends" type="datetime-local" value={endAt} onChange={(input) => setEndAt(input.target.value)} InputLabelProps={{ shrink: true }} required /><TextField select label="Venue" value={venueId} onChange={(input) => setVenueId(input.target.value)} required>{venues.map((venue) => <MenuItem key={venue.id} value={venue.id}>{venue.name}</MenuItem>)}</TextField><Stack direction="row" spacing={2}><Button href={`/events/${params.id}`}>Cancel</Button><Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save changes'}</Button></Stack></Stack>;
}
