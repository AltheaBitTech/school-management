'use client';

import EventOutlined from '@mui/icons-material/EventOutlined';import { resetSubmitting } from '@/lib/forms/submit-state';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
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
import { requiredText } from '@/lib/forms/field-rules';
import { getCurrentOrganization } from '@/lib/organizations/organizations-client';

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
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
    Promise.all([getEvent(params.id), listVenues({ active: true }), getCurrentOrganization()])
      .then(([data, venueResponse, organization]) => {
        setEvent(data);
        setVenues(venueResponse.data);
        setOrganizationTimezone(organization.timezone);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setType(data.type);
        setStartAt(toDateTimeInputValue(data.startAt, organization.timezone));
        setEndAt(toDateTimeInputValue(data.endAt, organization.timezone));
        setVenueId(data.venueId);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Failed to load event');
      })
      .finally(() => setIsLoading(false));
  }, [params.id]);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>): Promise<void> {
    formEvent.preventDefault();
    const nextTitleError = requiredText(title, 'Title', 3);
    setTitleError(nextTitleError);
    if (nextTitleError || (startAt && endAt && endAt <= startAt)) {
      if (startAt && endAt && endAt <= startAt) {
        setErrorMessage('End time must be after the start time.');
      }
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await updateEvent(params.id, {
        title,
        description,
        type,
        startAt: fromDateTimeInputValue(startAt, organizationTimezone),
        endAt: fromDateTimeInputValue(endAt, organizationTimezone),
        venueId,
      });
      showSuccess('Event updated');
      router.push(`/events/${params.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
      else setErrorMessage(error instanceof Error ? error.message : 'Failed to update event');
    }
  }

  if (isForbidden) return <ForbiddenState />;

  if (isLoading) {
    return (
      <FormPageShell title="Edit event" description="Update the schedule, venue, or description." icon={EventOutlined}>
        <Skeleton variant="rounded" height={280} />
      </FormPageShell>
    );
  }

  if (!event) return <Alert severity="error">{errorMessage ?? 'Event not found.'}</Alert>;

  if (event.status === 'ARCHIVED' || event.status === 'COMPLETED' || event.status === 'CANCELLED') {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">This event cannot be edited in its current state.</Alert>
        <Button component={Link} href={`/events/${params.id}`} variant="text">
          Back to event
        </Button>
      </Stack>
    );
  }

  const scheduleError = startAt && endAt && endAt <= startAt ? 'End time must be after the start time.' : null;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Edit event"
        description="Update the schedule, venue, or description."
        icon={EventOutlined}
        footer={
          <FormPageFooter
            cancelHref={`/events/${params.id}`}
            submitLabel="Save changes"
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
            submitDisabled={Boolean(titleError || scheduleError)}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <FormSection title="Event details" description="Title, schedule, and venue." maxWidth="100%">
          <TextField
            label="Title"
            value={title}
            onChange={(input) => setTitle(input.target.value)}
            onBlur={() => setTitleError(requiredText(title, 'Title', 3))}
            error={Boolean(titleError)}
            helperText={titleError ?? 'At least 3 characters'}
            required
            fullWidth
          />
          <TextField
            select
            label="Event type"
            value={type}
            onChange={(input) => setType(input.target.value as EventType)}
            required
            fullWidth
          >
            {EVENT_TYPES.map((item) => (
              <MenuItem key={item} value={item}>
                {formatEventType(item)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            value={description}
            onChange={(input) => setDescription(input.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label="Starts"
            type="datetime-local"
            value={startAt}
            onChange={(input) => setStartAt(input.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          <TextField
            label="Ends"
            type="datetime-local"
            value={endAt}
            onChange={(input) => setEndAt(input.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            error={Boolean(scheduleError)}
            helperText={scheduleError ?? 'Must be after the start time'}
          />
          <TextField
            select
            label="Venue"
            value={venueId}
            onChange={(input) => setVenueId(input.target.value)}
            required
            fullWidth
          >
            {venues.map((venue) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.name}
              </MenuItem>
            ))}
          </TextField>
        </FormSection>
      </FormPageShell>
    </Box>
  );
}
