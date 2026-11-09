'use client';

import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError, apiClient } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import { listStudents, type Student } from '@/lib/students/students-client';
import {
  validateOptionalMaxLength,
  validateOptionalTimeHHMM,
  validateRequiredMinMaxLength,
} from '@/lib/forms/validators';

interface StopDraft {
  id?: string;
  name: string;
  address: string;
  pickupTime: string;
}

interface RouteDetail {
  id: string;
  name: string;
  stops: Array<{ id: string; name: string; address?: string | null; pickupTime?: string | null }>;
}

interface VehicleOption {
  id: string;
  registrationNumber: string;
}

export default function TransportRoutePage() {
  const canManage = useCan('transport.manage');
  const canAssign = useCan('transport.assign');
  const params = useParams<{ id: string }>();
  const { showSuccess } = useAppSnackbar();
  const [routeName, setRouteName] = useState('');
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [studentId, setStudentId] = useState('');
  const [stopId, setStopId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [savedStops, setSavedStops] = useState<RouteDetail['stops']>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStops, setIsSavingStops] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    void apiClient
      .get<{ data: RouteDetail[] }>('/transport/routes', { auth: true })
      .then((response) => {
        const found = response.data.find((item) => item.id === params.id);
        if (!found) {
          setErrorMessage('Route not found.');
          return;
        }
        setRouteName(found.name);
        setSavedStops(found.stops);
        setStops(
          found.stops.map((stop) => ({
            id: stop.id,
            name: stop.name,
            address: stop.address ?? '',
            pickupTime: stop.pickupTime ?? '',
          })),
        );
      })
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Could not load the route'))
      .finally(() => setIsLoading(false));

    void listStudents({ page: 1, pageSize: 100 }).then((response) => setStudents(response.data)).catch(() => undefined);
    void apiClient
      .get<{ data: VehicleOption[] }>('/transport/vehicles', { auth: true })
      .then((response) => setVehicles(response.data))
      .catch(() => undefined);
  }, [params.id]);

  async function saveStops(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (stops.length > 40) {
      setErrorMessage('A route can have at most 40 stops.');
      return;
    }
    for (const stop of stops) {
      const nameProblem = validateRequiredMinMaxLength(stop.name, 'Stop name', 2, 80);
      const addressProblem = validateOptionalMaxLength(stop.address, 'Address', 160);
      const timeProblem = validateOptionalTimeHHMM(stop.pickupTime);
      if (nameProblem || addressProblem || timeProblem) {
        setErrorMessage(nameProblem ?? addressProblem ?? timeProblem ?? null);
        return;
      }
    }
    setIsSavingStops(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.put<{ data: RouteDetail }>(
        `/transport/routes/${params.id}/stops`,
        {
          stops: stops.map((stop) => ({
            name: stop.name.trim(),
            address: stop.address.trim() || undefined,
            pickupTime: stop.pickupTime || undefined,
          })),
        },
        { auth: true },
      );
      setSavedStops(response.data?.stops ?? []);
      showSuccess('Stops saved in pickup order.');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Could not save stops');
    } finally {
      setIsSavingStops(false);
    }
  }

  async function assignStudent(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!studentId || !stopId || !effectiveFrom) {
      setErrorMessage('Choose a student, a saved stop, and a start date.');
      return;
    }
    setIsAssigning(true);
    setErrorMessage(null);
    try {
      await apiClient.post(
        '/transport/assignments',
        {
          studentId,
          routeId: params.id,
          stopId,
          vehicleId: vehicleId || undefined,
          effectiveFrom,
        },
        { auth: true },
      );
      showSuccess('Student assigned to this route.');
      setStudentId('');
      setStopId('');
      setVehicleId('');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Could not assign the student');
    } finally {
      setIsAssigning(false);
    }
  }

  if (isLoading) {
    return (
      <FormPageShell title="Route" icon={DirectionsBusOutlined}>
        <Skeleton variant="rounded" height={240} />
      </FormPageShell>
    );
  }

  return (
    <Stack spacing={3}>
      <form onSubmit={saveStops}>
        <FormPageShell
          title={routeName || 'Route'}
          description="Stops are picked up from top to bottom. Save them before assigning students."
          icon={DirectionsBusOutlined}
          maxWidth={840}
        >
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <FormSection title="Stops" description="Add the pickup points in order." maxWidth="100%">
            {stops.map((stop, index) => (
              <Stack key={`${stop.id ?? 'new'}-${index}`} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  label={`Stop ${index + 1}`}
                  value={stop.name}
                  onChange={(event) => {
                    const next = [...stops];
                    next[index] = { ...stop, name: event.target.value };
                    setStops(next);
                  }}
                  required
                  fullWidth
                  disabled={!canManage}
                />
                <TextField
                  label="Pickup"
                  type="time"
                  value={stop.pickupTime}
                  onChange={(event) => {
                    const next = [...stops];
                    next[index] = { ...stop, pickupTime: event.target.value };
                    setStops(next);
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 140 }}
                  disabled={!canManage}
                />
                {canManage ? (
                  <IconButton
                    aria-label={`Remove stop ${index + 1}`}
                    onClick={() => setStops(stops.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <DeleteOutline />
                  </IconButton>
                ) : null}
              </Stack>
            ))}
            {canManage ? (
              <Button
                type="button"
                startIcon={<AddOutlined />}
                onClick={() => setStops([...stops, { name: '', address: '', pickupTime: '' }])}
              >
                Add stop
              </Button>
            ) : null}
            {canManage ? (
              <Button type="submit" variant="contained" disabled={isSavingStops}>
                {isSavingStops ? 'Saving…' : 'Save stops'}
              </Button>
            ) : null}
          </FormSection>
        </FormPageShell>
      </form>

      {canAssign ? <form onSubmit={assignStudent}>
        <FormSection title="Assign a student" description="Uses the stops you last saved." maxWidth={840}>
          <TextField select label="Student" value={studentId} onChange={(event) => setStudentId(event.target.value)} fullWidth required>
            {students.map((student) => (
              <MenuItem key={student.id} value={student.id}>
                {student.displayName || `${student.firstName} ${student.lastName}`} · {student.studentCode}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Stop" value={stopId} onChange={(event) => setStopId(event.target.value)} fullWidth required>
            {savedStops.map((stop) => (
              <MenuItem key={stop.id} value={stop.id}>
                {stop.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Vehicle" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} fullWidth>
            <MenuItem value="">None</MenuItem>
            {vehicles.map((vehicle) => (
              <MenuItem key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="From"
            type="date"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={isAssigning || savedStops.length === 0}>
            {isAssigning ? 'Assigning…' : 'Assign student'}
          </Button>
        </FormSection>
      </form> : null}
    </Stack>
  );
}
