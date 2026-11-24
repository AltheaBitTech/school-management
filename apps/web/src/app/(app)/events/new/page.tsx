'use client';

import EventOutlined from '@mui/icons-material/EventOutlined';
import { resetSubmitting } from '@/lib/forms/submit-state';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import {
  createEvent,
  createVenue,
  EVENT_TYPES,
  fromDateTimeInputValue,
  formatEventType,
  listVenues,
  type EventType,
  type Venue,
} from '@/lib/events/events-client';
import { useCan } from '@/lib/auth/use-can';
import { requiredText } from '@/lib/forms/field-rules';
import { getCurrentOrganization } from '@/lib/organizations/organizations-client';

export default function NewEventPage() {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const canManageVenues = useCan('event.manage_venues');
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
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueLocation, setVenueLocation] = useState('');
  const [isSavingVenue, setIsSavingVenue] = useState(false);

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
    const nextTitleError = requiredText(title, 'Title', 3);
    setTitleError(nextTitleError);
    if (nextTitleError || !startAt || !endAt || endAt <= startAt || !venueId) {
      if (startAt && endAt && endAt <= startAt) {
        setErrorMessage('End time must be after the start time.');
      }
      return;
    }
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
      showSuccess('Event created');
      router.push(`/events/${created.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
      else setErrorMessage(error instanceof Error ? error.message : 'Failed to create event');
    }
  }

  async function handleCreateVenue(): Promise<void> {
    const nameProblem = requiredText(venueName, 'Venue name', 2);
    if (nameProblem) {
      setErrorMessage(nameProblem);
      return;
    }
    setIsSavingVenue(true);
    setErrorMessage(null);
    try {
      const created = await createVenue({
        name: venueName.trim(),
        location: venueLocation.trim() || undefined,
      });
      setVenues((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setVenueId(created.id);
      setVenueName('');
      setVenueLocation('');
      setVenueDialogOpen(false);
      showSuccess('Venue added');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add venue');
    } finally {
      setIsSavingVenue(false);
    }
  }

  if (isForbidden) return <ForbiddenState />;

  const scheduleError = startAt && endAt && endAt <= startAt ? 'End time must be after the start time.' : null;
  const canSubmit = !isSubmitting && !isLoading && !titleError && !scheduleError && Boolean(venueId);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Create event"
        description="Add a scheduled event and assign its venue."
        icon={EventOutlined}
        footer={
          <FormPageFooter
            cancelHref="/events"
            submitLabel="Create event"
            submittingLabel="Creating…"
            isSubmitting={isSubmitting}
            submitDisabled={!canSubmit}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <FormSection title="Event details" description="Title, schedule, and venue." maxWidth="100%">
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => setTitleError(requiredText(title, 'Title', 3))}
            error={Boolean(titleError)}
            helperText={titleError ?? 'At least 3 characters'}
            required
            fullWidth
          />
          <TextField select label="Event type" value={type} onChange={(event) => setType(event.target.value as EventType)} required fullWidth>
            {EVENT_TYPES.map((item) => <MenuItem key={item} value={item}>{formatEventType(item)}</MenuItem>)}
          </TextField>
          <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={3} fullWidth />
          <TextField label="Starts" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} InputLabelProps={{ shrink: true }} required fullWidth />
          <TextField
            label="Ends"
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            error={Boolean(scheduleError)}
            helperText={scheduleError ?? 'Must be after the start time'}
          />
          <TextField select label="Venue" value={venueId} onChange={(event) => setVenueId(event.target.value)} required disabled={isLoading} fullWidth helperText={isLoading ? 'Loading venues…' : venues.length === 0 ? 'Add a venue before creating an event.' : undefined}>
            {venues.map((venue) => <MenuItem key={venue.id} value={venue.id}>{venue.name}</MenuItem>)}
          </TextField>
          {canManageVenues ? (
            <Button type="button" variant="outlined" onClick={() => setVenueDialogOpen(true)} sx={{ alignSelf: 'flex-start' }}>
              Add venue
            </Button>
          ) : null}
        </FormSection>
      </FormPageShell>
      <Dialog open={venueDialogOpen} onClose={() => setVenueDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add venue</DialogTitle>
        <DialogContent>
          <TextField
            label="Venue name"
            value={venueName}
            onChange={(event) => setVenueName(event.target.value)}
            required
            fullWidth
            margin="dense"
            autoFocus
          />
          <TextField
            label="Location"
            value={venueLocation}
            onChange={(event) => setVenueLocation(event.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setVenueDialogOpen(false)}>Cancel</Button>
          <Button type="button" variant="contained" disabled={isSavingVenue} onClick={() => void handleCreateVenue()}>
            {isSavingVenue ? 'Saving…' : 'Save venue'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
