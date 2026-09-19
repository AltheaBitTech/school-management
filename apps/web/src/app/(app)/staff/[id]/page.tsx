'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  formatAttendanceStatus,
  listAttendance,
  type AttendanceRecord,
} from '@/lib/attendance/attendance-client';
import { listOrganizationRoles, type OrganizationRole } from '@/lib/rbac/roles-client';
import {
  deactivateStaff,
  getStaff,
  getStaffDisplayName,
  provisionStaffLogin,
  type StaffMember,
} from '@/lib/staff/staff-client';

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');
  const [provisionRoleId, setProvisionRoleId] = useState('');
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await getStaff(params.id);
        if (!cancelled) {
          setStaff(response);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setIsForbidden(true);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load staff member');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStaff();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendanceHistory(): Promise<void> {
      setIsAttendanceLoading(true);
      setAttendanceError(null);

      try {
        const response = await listAttendance({
          page: 1,
          pageSize: 10,
          staffId: params.id,
        });

        if (!cancelled) {
          setAttendanceHistory(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setAttendanceError('You do not have permission to view attendance history.');
          } else {
            setAttendanceError(
              error instanceof Error ? error.message : 'Failed to load attendance history',
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsAttendanceLoading(false);
        }
      }
    }

    void loadAttendanceHistory();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function openProvisionDialog(): Promise<void> {
    setProvisionDialogOpen(true);
    setProvisionError(null);
    setProvisionEmail(staff?.email ?? '');
    setProvisionPassword('');
    setProvisionRoleId('');
    setRolesError(null);
    setIsRolesLoading(true);

    try {
      const loadedRoles = await listOrganizationRoles();
      setRoles(loadedRoles);
      if (loadedRoles.length === 1) {
        setProvisionRoleId(loadedRoles[0]!.id);
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setRolesError('You do not have permission to view organization roles.');
      } else {
        setRolesError(error instanceof Error ? error.message : 'Failed to load roles');
      }
    } finally {
      setIsRolesLoading(false);
    }
  }

  async function handleProvisionLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!staff) return;

    setIsProvisioning(true);
    setProvisionError(null);
    setSuccessMessage(null);

    try {
      const result = await provisionStaffLogin(staff.id, {
        email: provisionEmail,
        password: provisionPassword,
        roleId: provisionRoleId,
      });
      setStaff(result.staff);
      setProvisionDialogOpen(false);
      setSuccessMessage(`Login account created for ${result.loginEmail}.`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setProvisionError('You do not have permission to create login accounts.');
      } else if (error instanceof ApiError && error.statusCode === 409) {
        setProvisionError(error.message);
      } else {
        setProvisionError(error instanceof Error ? error.message : 'Failed to create login account');
      }
    } finally {
      setIsProvisioning(false);
    }
  }

  async function handleDeactivate(): Promise<void> {
    if (!staff) return;
    setIsDeactivating(true);
    setErrorMessage(null);

    try {
      const updated = await deactivateStaff(staff.id);
      setStaff(updated);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to deactivate staff member');
    } finally {
      setIsDeactivating(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading staff profile" />
      </Box>
    );
  }

  if (errorMessage || !staff) {
    return <Alert severity="error">{errorMessage ?? 'Staff member not found'}</Alert>;
  }

  const canProvisionLogin =
    !staff.userId &&
    staff.employmentStatus !== 'OFFBOARDED';

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            {getStaffDisplayName(staff)}
          </Typography>
          <Typography color="text.secondary">{staff.employeeCode}</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={Link} href={`/staff/${staff.id}/edit`} variant="outlined">
            Edit
          </Button>
          {canProvisionLogin ? (
            <Button variant="contained" onClick={() => void openProvisionDialog()}>
              Create Login
            </Button>
          ) : null}
          {staff.employmentStatus !== 'OFFBOARDED' ? (
            <Button color="warning" onClick={() => void handleDeactivate()} disabled={isDeactivating}>
              {isDeactivating ? 'Deactivating…' : 'Deactivate'}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Stack spacing={1} maxWidth="sm">
        <Typography><strong>Status:</strong> {staff.employmentStatus}</Typography>
        <Typography><strong>Department:</strong> {staff.department?.name ?? '—'}</Typography>
        <Typography><strong>Designation:</strong> {staff.designation ?? '—'}</Typography>
        <Typography><strong>Email:</strong> {staff.email ?? '—'}</Typography>
        <Typography><strong>Mobile:</strong> {staff.mobile ?? '—'}</Typography>
        <Typography>
          <strong>Joining date:</strong>{' '}
          {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : '—'}
        </Typography>
        <Typography>
          <strong>Login account:</strong>{' '}
          {staff.userId ? 'Linked' : 'Not provisioned'}
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <Typography variant="h6">Recent attendance</Typography>
        {isAttendanceLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} aria-label="Loading attendance history" />
          </Box>
        ) : null}
        {attendanceError ? <Alert severity="warning">{attendanceError}</Alert> : null}
        {!isAttendanceLoading && !attendanceError && attendanceHistory.length === 0 ? (
          <Alert severity="info">No attendance records found for this staff member.</Alert>
        ) : null}
        {!isAttendanceLoading && !attendanceError && attendanceHistory.length > 0 ? (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.attendanceDate}</TableCell>
                    <TableCell>{formatAttendanceStatus(record.status)}</TableCell>
                    <TableCell>{record.remarks ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : null}
      </Stack>

      <Button component={Link} href="/staff">
        Back to staff list
      </Button>

      <Dialog
        open={provisionDialogOpen}
        onClose={() => !isProvisioning && setProvisionDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        transitionDuration={0}
      >
        <Box component="form" onSubmit={handleProvisionLogin}>
          <DialogTitle>Create Login</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography color="text.secondary">
                Create a login account for {getStaffDisplayName(staff)}. The staff member can sign in
                using the organization code, login email, and temporary password.
              </Typography>

              <TextField
                label="Login email"
                type="email"
                value={provisionEmail}
                onChange={(event) => setProvisionEmail(event.target.value)}
                required
                fullWidth
              />

              {isRolesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={24} aria-label="Loading roles" />
                </Box>
              ) : null}

              {rolesError ? <Alert severity="error">{rolesError}</Alert> : null}

              {!isRolesLoading && !rolesError ? (
                <TextField
                  select
                  label="Role"
                  value={provisionRoleId}
                  onChange={(event) => setProvisionRoleId(event.target.value)}
                  required
                  fullWidth
                  disabled={roles.length === 0}
                  helperText={roles.length === 0 ? 'No organization roles are available.' : undefined}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              <TextField
                label="Temporary password"
                type="password"
                value={provisionPassword}
                onChange={(event) => setProvisionPassword(event.target.value)}
                required
                fullWidth
                helperText="Minimum 8 characters."
              />

              {provisionError ? <Alert severity="error">{provisionError}</Alert> : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProvisionDialogOpen(false)} disabled={isProvisioning}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                isProvisioning ||
                isRolesLoading ||
                Boolean(rolesError) ||
                roles.length === 0 ||
                !provisionEmail ||
                !provisionPassword ||
                !provisionRoleId
              }
            >
              {isProvisioning ? 'Creating login…' : 'Create Login'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
