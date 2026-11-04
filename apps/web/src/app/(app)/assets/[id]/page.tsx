'use client';

import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  assignAsset,
  completeAssetMaintenance,
  formatAssetDate,
  formatAssetDateTime,
  formatAssetHistoryEvent,
  formatAssetStatus,
  formatMaintenanceType,
  getAsset,
  getAssetStaffDisplayName,
  getAssetStudentDisplayName,
  isWarrantyActive,
  MAINTENANCE_TYPES,
  retireAsset,
  startAssetMaintenance,
  transferAsset,
  unassignAsset,
  type Asset,
  type MaintenanceType,
} from '@/lib/assets/assets-client';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';
import { listStudents, type Student } from '@/lib/students/students-client';

function statusColor(
  status: Asset['status'],
): 'success' | 'primary' | 'warning' | 'default' {
  switch (status) {
    case 'AVAILABLE':
      return 'success';
    case 'ASSIGNED':
      return 'primary';
    case 'UNDER_MAINTENANCE':
      return 'warning';
    case 'RETIRED':
      return 'default';
    default:
      return 'default';
  }
}

export default function AssetDetailPage() {
  const allowUpdate = useCan('asset.update');
  const allowAssign = useCan('asset.assign');
  const allowTransfer = useCan('asset.transfer');
  const allowMaintenance = useCan('asset.maintenance');
  const allowRetire = useCan('asset.retire');
  const params = useParams<{ id: string }>();
  const assetId = params.id;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const [assignTarget, setAssignTarget] = useState<'staff' | 'student'>('staff');
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignStudentId, setAssignStudentId] = useState('');

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferDepartmentId, setTransferDepartmentId] = useState('');
  const [transferLocation, setTransferLocation] = useState('');
  const [transferStaffId, setTransferStaffId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('REPAIR');
  const [maintenanceDescription, setMaintenanceDescription] = useState('');

  const [retireDialogOpen, setRetireDialogOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');

  async function reloadAsset(): Promise<void> {
    const data = await getAsset(assetId);
    setAsset(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      setIsNotFound(false);

      try {
        const [data, staffResponse, studentResponse, departmentResponse] = await Promise.all([
          getAsset(assetId),
          listStaff({
            page: 1,
            pageSize: 100,
            sortBy: 'firstName',
            sortOrder: 'asc',
            employmentStatus: 'ACTIVE',
          }),
          listStudents({ page: 1, pageSize: 100, status: 'ACTIVE' }),
          listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
        ]);
        if (!cancelled) {
          setAsset(data);
          setStaff(staffResponse.data);
          setStudents(studentResponse.data);
          setDepartments(departmentResponse.data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else if (error instanceof ApiError && error.statusCode === 404) {
          setIsNotFound(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load asset');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  async function handleActionError(error: unknown): Promise<void> {
    if (error instanceof ApiError && error.statusCode === 403) {
      setIsForbidden(true);
    } else if (error instanceof ApiError && error.statusCode === 409) {
      setErrorMessage(
        'This action is no longer available for the current asset state.',
      );
      await reloadAsset().catch(() => undefined);
    } else {
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    }
  }

  async function handleAssign(): Promise<void> {
    if (!asset) {
      return;
    }
    if (assignTarget === 'staff' && !assignStaffId) {
      return;
    }
    if (assignTarget === 'student' && !assignStudentId) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await assignAsset(
        asset.id,
        assignTarget === 'staff'
          ? { staffId: assignStaffId }
          : { studentId: assignStudentId },
      );
      await reloadAsset();
      setAssignStaffId('');
      setAssignStudentId('');
      setSuccessMessage('Asset assigned.');
    } catch (error) {
      await handleActionError(error);
    } finally {
      setIsActing(false);
    }
  }

  async function handleUnassign(): Promise<void> {
    if (!asset || asset.status !== 'ASSIGNED') {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await unassignAsset(asset.id);
      await reloadAsset();
      setSuccessMessage('Asset unassigned.');
    } catch (error) {
      await handleActionError(error);
    } finally {
      setIsActing(false);
    }
  }

  async function handleTransferConfirm(): Promise<void> {
    if (!asset) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await transferAsset(asset.id, {
        departmentId: transferDepartmentId || null,
        location: transferLocation || null,
        staffId: transferStaffId || null,
        reason: transferReason || undefined,
      });
      await reloadAsset();
      setTransferDialogOpen(false);
      setTransferDepartmentId('');
      setTransferLocation('');
      setTransferStaffId('');
      setTransferReason('');
      setSuccessMessage('Asset transferred.');
    } catch (error) {
      await handleActionError(error);
    } finally {
      setIsActing(false);
    }
  }

  async function handleStartMaintenanceConfirm(): Promise<void> {
    if (!asset || !maintenanceDescription.trim()) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await startAssetMaintenance(asset.id, {
        maintenanceType,
        description: maintenanceDescription.trim(),
      });
      await reloadAsset();
      setMaintenanceDialogOpen(false);
      setMaintenanceDescription('');
      setMaintenanceType('REPAIR');
      setSuccessMessage('Maintenance started.');
    } catch (error) {
      await handleActionError(error);
    } finally {
      setIsActing(false);
    }
  }

  async function handleCompleteMaintenance(): Promise<void> {
    if (!asset) {
      return;
    }

    const activeMaintenance = asset.maintenances?.find((entry) => !entry.completedAt);
    if (!activeMaintenance) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await completeAssetMaintenance(asset.id, activeMaintenance.id);
      await reloadAsset();
      setSuccessMessage('Maintenance completed.');
    } catch (error) {
      await handleActionError(error);
    } finally {
      setIsActing(false);
    }
  }

  async function handleRetireConfirm(): Promise<void> {
    if (!asset || !retireReason.trim()) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await retireAsset(asset.id, { reason: retireReason.trim() });
      await reloadAsset();
      setRetireDialogOpen(false);
      setRetireReason('');
      setSuccessMessage('Asset retired.');
    } catch (error) {
      await handleActionError(error);
    } finally {
      setIsActing(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isNotFound) {
    return <Alert severity="warning">Asset not found.</Alert>;
  }

  if (isLoading || !asset) {
    return (
      <Stack spacing={3}>
        <PageHeader title="Asset" description="Loading this asset." icon={Inventory2Outlined} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading asset" />
        </Box>
      </Stack>
    );
  }

  const activeMaintenance = asset.maintenances?.find((entry) => !entry.completedAt);
  const canAssign = allowAssign && (asset.status === 'AVAILABLE' || asset.status === 'ASSIGNED');
  const canUnassign = allowAssign && asset.status === 'ASSIGNED';
  const canTransfer = allowTransfer && (asset.status === 'AVAILABLE' || asset.status === 'ASSIGNED');
  const canStartMaintenance = allowMaintenance && (asset.status === 'AVAILABLE' || asset.status === 'ASSIGNED');
  const canCompleteMaintenance = allowMaintenance && asset.status === 'UNDER_MAINTENANCE' && Boolean(activeMaintenance);
  const canRetire = allowRetire && asset.status !== 'RETIRED';

  return (
    <Stack spacing={3}>
      <PageHeader
        title={asset.name}
        description={`${asset.assetCode}${asset.category ? ` · ${asset.category.name}` : ''}`}
        icon={Inventory2Outlined}
        actions={
        <Stack direction="row" spacing={1}>
          {allowUpdate && asset.status !== 'RETIRED' ? (
            <Button component={Link} href={`/assets/${asset.id}/edit`} variant="outlined">
              Edit
            </Button>
          ) : null}
          <Button component={Link} href="/assets" variant="outlined">
            Back to list
          </Button>
        </Stack>
        }
      />

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">Asset information</Typography>
            <Chip
              label={formatAssetStatus(asset.status)}
              color={statusColor(asset.status)}
              size="small"
            />
          </Stack>
          <Typography>Category: {asset.category?.name ?? asset.categoryId}</Typography>
          <Typography>Description: {asset.description || '—'}</Typography>
          {asset.status === 'RETIRED' ? (
            <>
              <Typography>
                Retired at: {asset.retiredAt ? formatAssetDateTime(asset.retiredAt) : '—'}
              </Typography>
              <Typography>Retirement reason: {asset.retirementReason || '—'}</Typography>
            </>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Identifiers</Typography>
          <Typography>Serial number: {asset.serialNumber || '—'}</Typography>
          <Typography>Barcode: {asset.barcode || '—'}</Typography>
          <Typography>QR code: {asset.qrCode || '—'}</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Assignment</Typography>
          <Typography>
            Assigned staff:{' '}
            {asset.assignedStaff
              ? getAssetStaffDisplayName(asset.assignedStaff)
              : '—'}
          </Typography>
          <Typography>
            Assigned student:{' '}
            {asset.assignedStudent
              ? getAssetStudentDisplayName(asset.assignedStudent)
              : '—'}
          </Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Department & location</Typography>
          <Typography>Department: {asset.department?.name ?? '—'}</Typography>
          <Typography>Location: {asset.location || '—'}</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Purchase & warranty</Typography>
          <Typography>
            Purchase date: {asset.purchaseDate ? formatAssetDate(asset.purchaseDate) : '—'}
          </Typography>
          <Typography>
            Purchase cost:{' '}
            {asset.purchaseCost != null ? asset.purchaseCost.toLocaleString() : '—'}
          </Typography>
          <Typography>
            Warranty start:{' '}
            {asset.warrantyStartDate ? formatAssetDate(asset.warrantyStartDate) : '—'}
          </Typography>
          <Typography>
            Warranty end: {asset.warrantyEndDate ? formatAssetDate(asset.warrantyEndDate) : '—'}
          </Typography>
          <Typography>
            Warranty status:{' '}
            {isWarrantyActive(asset) ? (
              <Chip label="Active" color="success" size="small" />
            ) : (
              'Not active'
            )}
          </Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Maintenance records</Typography>
          {asset.maintenances && asset.maintenances.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Completed</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {asset.maintenances.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatMaintenanceType(entry.maintenanceType)}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{formatAssetDateTime(entry.startedAt)}</TableCell>
                      <TableCell>
                        {entry.completedAt ? formatAssetDateTime(entry.completedAt) : '—'}
                      </TableCell>
                      <TableCell>
                        {entry.completedAt ? 'Completed' : 'In progress'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography color="text.secondary">No maintenance records yet.</Typography>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Transfer history</Typography>
          {asset.transfers && asset.transfers.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Transferred at</TableCell>
                    <TableCell>From location</TableCell>
                    <TableCell>To location</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {asset.transfers.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatAssetDateTime(entry.transferredAt)}</TableCell>
                      <TableCell>{entry.fromLocation || '—'}</TableCell>
                      <TableCell>{entry.toLocation || '—'}</TableCell>
                      <TableCell>{entry.reason || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography color="text.secondary">No transfers recorded yet.</Typography>
          )}
        </Stack>
      </Paper>

      {canAssign || canUnassign || canTransfer || canStartMaintenance || canCompleteMaintenance || canRetire ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Lifecycle actions</Typography>

            {canAssign ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <TextField
                  select
                  label="Assign to"
                  value={assignTarget}
                  onChange={(event) =>
                    setAssignTarget(event.target.value as 'staff' | 'student')
                  }
                  sx={{ minWidth: 140 }}
                  size="small"
                >
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="student">Student</MenuItem>
                </TextField>
                {assignTarget === 'staff' ? (
                  <TextField
                    select
                    label="Staff member"
                    value={assignStaffId}
                    onChange={(event) => setAssignStaffId(event.target.value)}
                    sx={{ minWidth: 240 }}
                    size="small"
                  >
                    <MenuItem value="">Select staff</MenuItem>
                    {staff.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {getStaffDisplayName(member)}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    select
                    label="Student"
                    value={assignStudentId}
                    onChange={(event) => setAssignStudentId(event.target.value)}
                    sx={{ minWidth: 240 }}
                    size="small"
                  >
                    <MenuItem value="">Select student</MenuItem>
                    {students.map((student) => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.studentCode} — {student.firstName} {student.lastName}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <Button
                  variant="contained"
                  disabled={
                    isActing ||
                    (assignTarget === 'staff' ? !assignStaffId : !assignStudentId)
                  }
                  onClick={handleAssign}
                >
                  {isActing ? 'Assigning…' : 'Assign'}
                </Button>
              </Stack>
            ) : null}

            <Stack direction="row" spacing={2} flexWrap="wrap">
              {canUnassign ? (
                <Button variant="outlined" disabled={isActing} onClick={handleUnassign}>
                  {isActing ? 'Working…' : 'Unassign'}
                </Button>
              ) : null}
              {canTransfer ? (
                <Button
                  variant="outlined"
                  disabled={isActing}
                  onClick={() => setTransferDialogOpen(true)}
                >
                  Transfer
                </Button>
              ) : null}
              {canStartMaintenance ? (
                <Button
                  variant="outlined"
                  color="warning"
                  disabled={isActing}
                  onClick={() => setMaintenanceDialogOpen(true)}
                >
                  Start maintenance
                </Button>
              ) : null}
              {canCompleteMaintenance ? (
                <Button
                  variant="contained"
                  color="success"
                  disabled={isActing}
                  onClick={handleCompleteMaintenance}
                >
                  {isActing ? 'Completing…' : 'Complete maintenance'}
                </Button>
              ) : null}
              {canRetire ? (
                <Button
                  variant="contained"
                  color="error"
                  disabled={isActing}
                  onClick={() => setRetireDialogOpen(true)}
                >
                  Retire asset
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">History</Typography>
          <Divider />
          {asset.history && asset.history.length > 0 ? (
            asset.history.map((entry) => (
              <Box key={entry.id}>
                <Typography fontWeight={600}>
                  {formatAssetHistoryEvent(entry.eventType)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatAssetDateTime(entry.createdAt)}
                  {entry.actorUser ? ` · ${entry.actorUser.email}` : ''}
                </Typography>
                {entry.comment ? (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {entry.comment}
                  </Typography>
                ) : null}
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">No history recorded yet.</Typography>
          )}
        </Stack>
      </Paper>

      <Dialog open={transferDialogOpen} onClose={() => !isActing && setTransferDialogOpen(false)}>
        <DialogTitle>Transfer asset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <Typography variant="body2" color="text.secondary">
              Update department, location, or assigned staff. At least one destination field is
              required.
            </Typography>
            <TextField
              select
              label="Department"
              value={transferDepartmentId}
              onChange={(event) => setTransferDepartmentId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">No change / clear</MenuItem>
              {departments.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Location"
              value={transferLocation}
              onChange={(event) => setTransferLocation(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Assigned staff"
              value={transferStaffId}
              onChange={(event) => setTransferStaffId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">No change / unassign</MenuItem>
              {staff.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {getStaffDisplayName(member)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reason"
              value={transferReason}
              onChange={(event) => setTransferReason(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)} disabled={isActing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleTransferConfirm}
            disabled={
              isActing ||
              (!transferDepartmentId && !transferLocation && !transferStaffId)
            }
          >
            {isActing ? 'Transferring…' : 'Confirm transfer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={maintenanceDialogOpen}
        onClose={() => !isActing && setMaintenanceDialogOpen(false)}
      >
        <DialogTitle>Start maintenance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            {asset.assignedStaff ? (
              <Alert severity="warning">
                Starting maintenance will clear the current staff assignment.
              </Alert>
            ) : null}
            <TextField
              select
              label="Maintenance type"
              value={maintenanceType}
              onChange={(event) => setMaintenanceType(event.target.value as MaintenanceType)}
              fullWidth
            >
              {MAINTENANCE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {formatMaintenanceType(type)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={maintenanceDescription}
              onChange={(event) => setMaintenanceDescription(event.target.value)}
              multiline
              minRows={2}
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaintenanceDialogOpen(false)} disabled={isActing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleStartMaintenanceConfirm}
            disabled={isActing || !maintenanceDescription.trim()}
          >
            {isActing ? 'Starting…' : 'Confirm start'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={retireDialogOpen} onClose={() => !isActing && setRetireDialogOpen(false)}>
        <DialogTitle>Retire asset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <Typography variant="body2" color="text.secondary">
              Retiring an asset is permanent. The asset cannot be assigned or transferred again.
            </Typography>
            <TextField
              label="Retirement reason"
              value={retireReason}
              onChange={(event) => setRetireReason(event.target.value)}
              multiline
              minRows={2}
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetireDialogOpen(false)} disabled={isActing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRetireConfirm}
            disabled={isActing || !retireReason.trim()}
          >
            {isActing ? 'Retiring…' : 'Confirm retire'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
