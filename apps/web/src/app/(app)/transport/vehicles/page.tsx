'use client';

import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { FormEvent, useEffect, useState } from 'react';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { FormSection } from '@/components/ui/FormSection';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError, apiClient } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';
import { validateRequiredMinMaxLength } from '@/lib/forms/validators';

interface VehicleRow {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  capacity: number;
  active: boolean;
  driver?: { firstName: string; lastName: string; displayName: string | null } | null;
}

export default function TransportVehiclesPage() {
  const canManage = useCan('transport.manage');
  const { showSuccess } = useAppSnackbar();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [capacity, setCapacity] = useState('40');
  const [driverStaffId, setDriverStaffId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load(): void {
    setIsLoading(true);
    void apiClient
      .get<{ data: VehicleRow[] }>('/transport/vehicles', { auth: true })
      .then((response) => setVehicles(response.data))
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Could not load vehicles'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    void listStaff({ page: 1, pageSize: 100, employmentStatus: 'ACTIVE' })
      .then((response) => setStaff(response.data))
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const registrationProblem = validateRequiredMinMaxLength(registrationNumber, 'Registration', 2, 20);
    const typeProblem = validateRequiredMinMaxLength(vehicleType, 'Type', 2, 40);
    const seats = Number(capacity);
    const capacityProblem =
      !Number.isInteger(seats) || seats < 1 ? 'Capacity must be a whole number of at least 1.' : null;
    if (registrationProblem || typeProblem || capacityProblem) {
      setErrorMessage(registrationProblem ?? typeProblem ?? capacityProblem);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.post(
        '/transport/vehicles',
        {
          registrationNumber,
          vehicleType,
          capacity: seats,
          driverStaffId: driverStaffId || undefined,
        },
        { auth: true },
      );
      showSuccess('Vehicle added.');
      setRegistrationNumber('');
      load();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Could not add the vehicle');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ListPageShell
      title="Vehicles"
      description="Registration, seats, and the staff member who drives."
      icon={DirectionsBusOutlined}
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {canManage ? <form onSubmit={handleSubmit}>
        <FormSection title="Add a vehicle" maxWidth="100%">
          <TextField label="Registration" value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} required fullWidth />
          <TextField label="Type" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} required fullWidth helperText="Bus, van, or minibus" />
          <TextField label="Seats" type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} required fullWidth inputProps={{ min: 1 }} />
          <TextField select label="Driver" value={driverStaffId} onChange={(event) => setDriverStaffId(event.target.value)} fullWidth>
            <MenuItem value="">None</MenuItem>
            {staff.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {getStaffDisplayName(member)}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Add vehicle'}
          </Button>
        </FormSection>
      </form> : null}
      {isLoading ? <LoadingState label="Loading vehicles" columnCount={4} /> : null}
      {!isLoading && vehicles.length === 0 ? (
        <EmptyState icon={DirectionsBusOutlined} message="No vehicles yet." />
      ) : null}
      {!isLoading && vehicles.length > 0 ? (
        <AppTable minWidth={640} aria-label="Vehicles">
          <TableHead>
            <TableRow>
              <TableCell>Registration</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Seats</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} hover>
                <TableCell>{vehicle.registrationNumber}</TableCell>
                <TableCell>{vehicle.vehicleType}</TableCell>
                <TableCell>{vehicle.capacity}</TableCell>
                <TableCell>
                  <StatusChip status={vehicle.active ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </ListPageShell>
  );
}
