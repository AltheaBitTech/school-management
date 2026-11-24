'use client';

import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { InviteDeliveryNotice } from '@/components/auth/InviteDeliveryNotice';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { AppTable } from '@/components/ui/AppTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailFactRow, DetailPageShell } from '@/components/ui/DetailPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { isAttendanceEnabled } from '@/lib/features/feature-flags';
import { useCan, useCanEvery } from '@/lib/auth/use-can';
import {
  formatAttendanceStatus,
  listAttendance,
  type AttendanceRecord,
} from '@/lib/attendance/attendance-client';
import {
  formatLeaveStatus,
  listLeaveBalances,
  listLeaveRequests,
  listLeaveTypes,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveType,
} from '@/lib/leave/leave-client';
import { AssignAdditionalRole } from '@/components/rbac/AssignAdditionalRole';
import { filterStaffAssignableRoles } from '@/lib/rbac/staff-assignable-roles';
import { listOrganizationRoles, type OrganizationRole } from '@/lib/rbac/roles-client';
import {
  deactivateStaff,
  getStaff,
  getStaffDisplayName,
  getStaffInitials,
  provisionStaffLogin,
  type StaffMember,
} from '@/lib/staff/staff-client';

function formatDate(value?: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toLocaleDateString();
}

export default function StaffDetailPage() {
  const canEditStaff = useCan('staff.update');
  const canDeactivate = useCan('staff.deactivate');
  const canSendInvite = useCanEvery(['user.create', 'role.assign']);
  const canAssignRole = useCan('role.assign');
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const preferredProvisionRoleId = searchParams.get('provisionRoleId') ?? '';
  const { showSuccess } = useAppSnackbar();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLeaveLoading, setIsLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);

  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionRoleId, setProvisionRoleId] = useState('');
  const [inviteDialogData, setInviteDialogData] = useState<{
    name: string;
    loginEmail: string;
    inviteUrl: string;
    inviteExpiresAt: string;
    emailSent: boolean;
    emailError?: { code: string; message: string };
    deliveryNote?: string;
  } | null>(null);
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
    if (!isAttendanceEnabled()) {
      return;
    }

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

  useEffect(() => {
    let cancelled = false;

    async function loadLeave(): Promise<void> {
      setIsLeaveLoading(true);
      setLeaveError(null);

      try {
        const [balances, requests, types] = await Promise.all([
          listLeaveBalances({ page: 1, pageSize: 20, staffId: params.id }),
          listLeaveRequests({ page: 1, pageSize: 5, staffId: params.id }),
          listLeaveTypes({ page: 1, pageSize: 100 }),
        ]);

        if (!cancelled) {
          setLeaveBalances(balances.data);
          setLeaveRequests(requests.data);
          setLeaveTypes(types.data);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setLeaveError('You do not have permission to view leave for this staff member.');
          } else {
            setLeaveError(error instanceof Error ? error.message : 'Failed to load leave');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLeaveLoading(false);
        }
      }
    }

    void loadLeave();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function openProvisionDialog(): Promise<void> {
    setProvisionDialogOpen(true);
    setProvisionError(null);
    setProvisionEmail(staff?.email ?? '');
    setProvisionRoleId('');
    setRolesError(null);
    setIsRolesLoading(true);

    try {
      const loadedRoles = filterStaffAssignableRoles(await listOrganizationRoles());
      setRoles(loadedRoles);
      const defaultRoleId =
        preferredProvisionRoleId ||
        loadedRoles.find((role) => role.code === 'TEACHER')?.id ||
        loadedRoles[0]?.id ||
        '';
      if (defaultRoleId) {
        setProvisionRoleId(defaultRoleId);
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

    try {
      const result = await provisionStaffLogin(staff.id, {
        email: provisionEmail,
        roleId: provisionRoleId,
      });
      setStaff(result.staff);
      setProvisionDialogOpen(false);
      showSuccess(result.emailSent ? 'Login invite emailed' : 'Login created');
      setInviteDialogData({
        name: getStaffDisplayName(staff),
        loginEmail: result.loginEmail,
        inviteUrl: result.inviteUrl,
        inviteExpiresAt: result.inviteExpiresAt,
        emailSent: Boolean(result.emailSent),
        emailError: result.emailError,
        deliveryNote: result.deliveryNote,
      });
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
      showSuccess('Staff member deactivated');
      setDeactivateConfirmOpen(false);
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
    canSendInvite &&
    !staff.userId &&
    staff.employmentStatus !== 'OFFBOARDED';
  const assignedRoleNames =
    staff.loginRoles?.map((role) => role.name).join(', ') || staff.loginRole?.name || 'None assigned';
  const assignedRoleIds = staff.loginRoles?.map((role) => role.id) ?? (staff.loginRole ? [staff.loginRole.id] : []);
  const attendanceCounts = attendanceHistory.reduce<Record<string, number>>((counts, record) => {
    counts[record.status] = (counts[record.status] ?? 0) + 1;
    return counts;
  }, {});
  const leaveTypeName = (leaveTypeId: string): string =>
    leaveTypes.find((type) => type.id === leaveTypeId)?.name ?? 'Leave balance';

  return (
    <>
    <DetailPageShell
      title={getStaffDisplayName(staff)}
      description={`${staff.employeeCode}${staff.designation ? ` · ${staff.designation}` : ''}`}
      icon={BadgeOutlined}
      actions={
        <>
          {canEditStaff ? (
            <Button component={Link} href={`/staff/${staff.id}/edit`} variant="outlined">
              Edit
            </Button>
          ) : null}
          {canProvisionLogin ? (
            <Button variant="contained" onClick={() => void openProvisionDialog()}>
              Send invite
            </Button>
          ) : null}
          {canDeactivate && staff.employmentStatus !== 'OFFBOARDED' ? (
            <Button color="warning" onClick={() => setDeactivateConfirmOpen(true)} disabled={isDeactivating}>
              {isDeactivating ? 'Deactivating…' : 'Deactivate'}
            </Button>
          ) : null}
        </>
      }
      meta={
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.dark', width: 48, height: 48 }}>
              {getStaffInitials(staff)}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {staff.department?.name ?? 'No department'}
            </Typography>
          </Stack>
          <Typography variant="overline" color="text.secondary">
            Staff overview
          </Typography>
          <DetailFactRow label="Status">
            <StatusChip status={staff.employmentStatus} label={staff.employmentStatus.replace(/_/g, ' ')} />
          </DetailFactRow>
          <DetailFactRow label="Job title">{staff.designation ?? '—'}</DetailFactRow>
          <DetailFactRow label="System roles">{assignedRoleNames}</DetailFactRow>
          <Typography variant="body2" color="text.secondary">
            Job title is the employment designation. System role is the access granted after sign-in.
          </Typography>
        </Stack>
      }
    >
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Personal information</Typography>
            <DetailFactRow label="First name">{staff.firstName}</DetailFactRow>
            <DetailFactRow label="Last name">{staff.lastName}</DetailFactRow>
            {staff.displayName ? <DetailFactRow label="Display name">{staff.displayName}</DetailFactRow> : null}
            <DetailFactRow label="Email">{staff.email ?? '—'}</DetailFactRow>
            <DetailFactRow label="Mobile">{staff.mobile ?? '—'}</DetailFactRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Employment information</Typography>
            <DetailFactRow label="Employee code">{staff.employeeCode}</DetailFactRow>
            <DetailFactRow label="Department">{staff.department?.name ?? '—'}</DetailFactRow>
            <DetailFactRow label="Job title">{staff.designation ?? '—'}</DetailFactRow>
            <DetailFactRow label="Joining date">{formatDate(staff.joiningDate)}</DetailFactRow>
            {staff.lastWorkingDate ? (
              <DetailFactRow label="Last working date">{formatDate(staff.lastWorkingDate)}</DetailFactRow>
            ) : null}
            <DetailFactRow label="Employment status">
              <StatusChip status={staff.employmentStatus} label={staff.employmentStatus.replace(/_/g, ' ')} />
            </DetailFactRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <MarkEmailReadOutlined color="primary" />
              <Typography variant="h6">Login & access</Typography>
            </Stack>
            <DetailFactRow label="Account">{staff.userId ? 'Linked' : 'Not provisioned'}</DetailFactRow>
            <DetailFactRow label="Job title">{staff.designation ?? '—'}</DetailFactRow>
            <DetailFactRow label="System roles">{assignedRoleNames}</DetailFactRow>
            <Typography variant="body2" color="text.secondary">
              Job title is the employment designation. System roles are the access used after sign-in.
            </Typography>
            {canAssignRole && staff.userId ? (
              <AssignAdditionalRole
                userId={staff.userId}
                assignedRoleIds={assignedRoleIds}
                onAssigned={() => {
                  void getStaff(staff.id).then(setStaff).catch(() => undefined);
                }}
              />
            ) : null}
            {canProvisionLogin ? (
              <Button variant="contained" size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => void openProvisionDialog()}>
                Send login invite
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {isAttendanceEnabled() ? (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <Typography variant="h6">Attendance</Typography>
              <Button component={Link} href="/attendance" size="small">
                Open attendance
              </Button>
            </Stack>
            {!isAttendanceLoading && !attendanceError && attendanceHistory.length > 0 ? (
              <Typography variant="body2" color="text.secondary">
                Latest {attendanceHistory.length} record{attendanceHistory.length === 1 ? '' : 's'}:{' '}
                {Object.entries(attendanceCounts)
                  .map(([status, count]) => `${formatAttendanceStatus(status as AttendanceRecord['status'])} ${count}`)
                  .join(', ')}
                . This is not a full-history percentage.
              </Typography>
            ) : null}
            {isAttendanceLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} aria-label="Loading attendance history" />
              </Box>
            ) : null}
            {attendanceError ? <Alert severity="warning">{attendanceError}</Alert> : null}
            {!isAttendanceLoading && !attendanceError && attendanceHistory.length === 0 ? (
              <Alert severity="info">No attendance records yet. Mark attendance from the attendance module.</Alert>
            ) : null}
            {!isAttendanceLoading && !attendanceError && attendanceHistory.length > 0 ? (
              <AppTable aria-label="Staff attendance history">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceHistory.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{record.attendanceDate}</TableCell>
                      <TableCell>{formatAttendanceStatus(record.status)}</TableCell>
                      <TableCell>{record.remarks ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AppTable>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <Typography variant="h6">Leave</Typography>
              <Button component={Link} href="/leave" size="small">
                Open leave
              </Button>
            </Stack>
            {isLeaveLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} aria-label="Loading leave" />
              </Box>
            ) : null}
            {leaveError ? <Alert severity="warning">{leaveError}</Alert> : null}
            {!isLeaveLoading && !leaveError && leaveBalances.length === 0 && leaveRequests.length === 0 ? (
              <Alert severity="info">No leave balances or requests are recorded for this staff member.</Alert>
            ) : null}
            {!isLeaveLoading && !leaveError && leaveBalances.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Balances</Typography>
                {leaveBalances.map((balance) => (
                  <DetailFactRow key={balance.id} label={leaveTypeName(balance.leaveTypeId)}>
                    {balance.availableAmount} available · {balance.usedAmount} used · {balance.pendingAmount} pending
                    {' · '}
                    {formatDate(balance.periodStart)} – {formatDate(balance.periodEnd)}
                  </DetailFactRow>
                ))}
              </Stack>
            ) : null}
            {!isLeaveLoading && !leaveError && leaveRequests.length > 0 ? (
              <AppTable aria-label="Recent leave requests" minWidth={480}>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.leaveType?.name ?? leaveTypeName(request.leaveTypeId)}</TableCell>
                      <TableCell>
                        {formatDate(request.startDate)} – {formatDate(request.endDate)}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={request.status} label={formatLeaveStatus(request.status)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AppTable>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Documents</Typography>
            <Typography variant="body2" color="text.secondary">
              Certificates and ID cards are issued from Documents. This profile does not store a separate file
              upload, and the document list cannot be filtered to one staff member yet.
            </Typography>
            <Button component={Link} href="/documents" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
              Open documents
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Button component={Link} href="/staff" variant="text" sx={{ alignSelf: 'flex-start' }}>
        Back to staff list
      </Button>
    </DetailPageShell>

      <Dialog
        open={provisionDialogOpen}
        onClose={() => !isProvisioning && setProvisionDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        transitionDuration={0}
      >
        <Box component="form" onSubmit={handleProvisionLogin}>
          <DialogTitle>Send login invite</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography color="text.secondary">
                Create a login for {getStaffDisplayName(staff)} and share the invite link so they can
                set their own password.
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
                  label="System role"
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
                !provisionRoleId
              }
            >
              {isProvisioning ? 'Sending invite…' : 'Send Invite'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(inviteDialogData)} onClose={() => setInviteDialogData(null)} fullWidth maxWidth="sm">
        <DialogTitle>Login created for {inviteDialogData?.name}</DialogTitle>
        <DialogContent>
          {inviteDialogData ? (
            <Box sx={{ mt: 1 }}>
              <InviteDeliveryNotice delivery={inviteDialogData} audience="staff member" />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogData(null)}>Done</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deactivateConfirmOpen}
        title="Deactivate staff member?"
        description={`${getStaffDisplayName(staff)} will be marked offboarded and lose active access.`}
        confirmLabel="Deactivate"
        confirmColor="warning"
        isConfirming={isDeactivating}
        onCancel={() => setDeactivateConfirmOpen(false)}
        onConfirm={() => void handleDeactivate()}
      />
    </>
  );
}
