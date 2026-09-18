'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';
import { getStudentDisplayName, listStudents, type Student } from '@/lib/students/students-client';
import {
  addEventParticipant,
  archiveEvent,
  cancelEvent,
  completeEvent,
  formatEventDateTime,
  formatEventStatus,
  formatEventType,
  getEvent,
  removeEventParticipant,
  scheduleEvent,
  type CampusEvent,
  type EventParticipantType,
} from '@/lib/events/events-client';
import { getCurrentOrganization } from '@/lib/organizations/organizations-client';

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [participantType, setParticipantType] = useState<EventParticipantType>('STAFF');
  const [participantId, setParticipantId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [organizationTimezone, setOrganizationTimezone] = useState('UTC');

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setIsLoading(true);
      try {
        const [eventData, organization] = await Promise.all([
          getEvent(eventId),
          getCurrentOrganization(),
        ]);
        if (!cancelled) {
          setEvent(eventData);
          setOrganizationTimezone(organization.timezone);
        }
        const [staffResult, studentResult] = await Promise.allSettled([
          listStaff({ page: 1, pageSize: 100, employmentStatus: 'ACTIVE', sortBy: 'firstName', sortOrder: 'asc' }),
          listStudents({ page: 1, pageSize: 100, status: 'ACTIVE' }),
        ]);
        if (!cancelled && staffResult.status === 'fulfilled') setStaff(staffResult.value.data);
        if (!cancelled && studentResult.status === 'fulfilled') setStudents(studentResult.value.data);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else if (error instanceof ApiError && error.statusCode === 404) setIsNotFound(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Failed to load event');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [eventId]);

  async function perform(action: () => Promise<CampusEvent>, message: string): Promise<void> {
    setIsActing(true); setErrorMessage(null); setSuccessMessage(null);
    try { setEvent(await action()); setSuccessMessage(message); }
    catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
      else {
        setErrorMessage(error instanceof Error ? error.message : 'Action failed');
        await getEvent(eventId).then(setEvent).catch(() => undefined);
      }
    } finally { setIsActing(false); }
  }

  async function addParticipant(): Promise<void> {
    if (!event || !participantId) return;
    setIsActing(true); setErrorMessage(null); setSuccessMessage(null);
    try { await addEventParticipant(event.id, { participantType, participantId }); setEvent(await getEvent(event.id)); setParticipantId(''); setSuccessMessage('Participant added.'); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Failed to add participant'); }
    finally { setIsActing(false); }
  }

  async function removeParticipant(id: string): Promise<void> {
    if (!event) return;
    setIsActing(true); setErrorMessage(null);
    try { await removeEventParticipant(event.id, id); setEvent(await getEvent(event.id)); setSuccessMessage('Participant removed.'); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Failed to remove participant'); }
    finally { setIsActing(false); }
  }

  if (isForbidden) return <ForbiddenState />;
  if (isLoading) return <CircularProgress />;
  if (isNotFound) return <Alert severity="error">Event not found.</Alert>;
  if (!event) return <Alert severity="error">{errorMessage ?? 'Event could not be loaded.'}</Alert>;

  const editable = event.status === 'DRAFT' || event.status === 'SCHEDULED';
  const participantOptions = participantType === 'STAFF' ? staff : students;
  const participantName = (kind: EventParticipantType, id: string) => {
    if (kind === 'STAFF') {
      const member = staff.find((item) => item.id === id);
      return member ? getStaffDisplayName(member) : id;
    }
    const student = students.find((item) => item.id === id);
    return student ? getStudentDisplayName(student) : id;
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box><Typography variant="h4" component="h1">{event.title}</Typography><Typography color="text.secondary">{formatEventType(event.type)} at {event.venue.name}</Typography></Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {editable && <Button component={Link} href={`/events/${event.id}/edit`}>Edit</Button>}
          {event.status === 'DRAFT' || event.status === 'SCHEDULED' ? <Button color="error" disabled={isActing} onClick={() => void perform(() => cancelEvent(event.id), 'Event cancelled.')}>Cancel</Button> : null}
          {event.status === 'DRAFT' && <Button variant="outlined" disabled={isActing} onClick={() => void perform(() => scheduleEvent(event.id), 'Event scheduled.')}>Schedule</Button>}
          {event.status === 'SCHEDULED' && <Button variant="contained" disabled={isActing} onClick={() => void perform(() => completeEvent(event.id), 'Event completed.')}>Complete</Button>}
          {event.status === 'COMPLETED' && <Button variant="contained" disabled={isActing} onClick={() => void perform(() => archiveEvent(event.id), 'Event archived.')}>Archive</Button>}
        </Stack>
      </Stack>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}
      <Chip label={formatEventStatus(event.status)} sx={{ width: 'fit-content' }} />
      <Stack spacing={1}><Typography><strong>When:</strong> {formatEventDateTime(event.startAt, organizationTimezone)} - {formatEventDateTime(event.endAt, organizationTimezone)}</Typography><Typography><strong>Venue:</strong> {event.venue.name}{event.venue.location ? `, ${event.venue.location}` : ''}</Typography><Typography><strong>Description:</strong> {event.description || 'No description.'}</Typography></Stack>
      <Divider />
      <Stack spacing={2}>
        <Typography variant="h6">Participants</Typography>
        {editable && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select label="Type" value={participantType} onChange={(input) => { setParticipantType(input.target.value as EventParticipantType); setParticipantId(''); }} sx={{ minWidth: 140 }}><MenuItem value="STAFF">Staff</MenuItem><MenuItem value="STUDENT">Student</MenuItem></TextField><TextField select label="Participant" value={participantId} onChange={(input) => setParticipantId(input.target.value)} sx={{ minWidth: 260 }}><MenuItem value="">Select participant</MenuItem>{participantOptions.map((item) => <MenuItem key={item.id} value={item.id}>{participantType === 'STAFF' ? getStaffDisplayName(item as StaffMember) : getStudentDisplayName(item as Student)}</MenuItem>)}</TextField><Button variant="outlined" disabled={!participantId || isActing} onClick={() => void addParticipant()}>Add</Button></Stack>}
        {event.participants.length === 0 ? <Typography color="text.secondary">No participants assigned.</Typography> : event.participants.map((participant) => <Stack key={participant.id} direction="row" justifyContent="space-between" alignItems="center"><Typography>{participant.participantType}: {participantName(participant.participantType, participant.participantId)}</Typography>{editable && <Button size="small" color="error" disabled={isActing} onClick={() => void removeParticipant(participant.id)}>Remove</Button>}</Stack>)}
      </Stack>
      <Button component={Link} href="/events" sx={{ alignSelf: 'flex-start' }}>Back to events</Button>
    </Stack>
  );
}
