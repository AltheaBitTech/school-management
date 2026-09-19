'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import {
  ATTENDANCE_STATUS_OPTIONS,
  formatAttendanceStatus,
  listAttendance,
  saveAttendanceForStaff,
  type AttendanceRecord,
  type AttendanceStatus,
} from '@/lib/attendance/attendance-client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const [attendanceDate, setAttendanceDate] = useState(todayDateInputValue());
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendanceByStaffId, setAttendanceByStaffId] = useState<Record<string, AttendanceRecord>>({});
  const [draftStatus, setDraftStatus] = useState<Record<string, AttendanceStatus>>({});
  const [draftRemarks, setDraftRemarks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    void listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((response) => setDepartments(response.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDailyAttendance(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsForbidden(false);

      try {
        const [staffResponse, attendanceResponse] = await Promise.all([
          listStaff({
            page: 1,
            pageSize: 100,
            departmentId: departmentId || undefined,
            sortBy: 'firstName',
            sortOrder: 'asc',
          }),
          listAttendance({
            page: 1,
            pageSize: 100,
            attendanceDate,
            departmentId: departmentId || undefined,
          }),
        ]);

        if (cancelled) return;

        const nextAttendanceByStaffId = Object.fromEntries(
          attendanceResponse.data.map((record) => [record.staffId, record]),
        );
        const nextDraftStatus = Object.fromEntries(
          staffResponse.data.map((member) => [
            member.id,
            nextAttendanceByStaffId[member.id]?.status ?? 'ABSENT',
          ]),
        );
        const nextDraftRemarks = Object.fromEntries(
          staffResponse.data.map((member) => [
            member.id,
            nextAttendanceByStaffId[member.id]?.remarks ?? '',
          ]),
        );

        setStaff(staffResponse.data);
        setAttendanceByStaffId(nextAttendanceByStaffId);
        setDraftStatus(nextDraftStatus);
        setDraftRemarks(nextDraftRemarks);
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setIsForbidden(true);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load attendance');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDailyAttendance();
    return () => {
      cancelled = true;
    };
  }, [attendanceDate, departmentId]);

  const activeStaff = useMemo(
    () => staff.filter((member) => member.employmentStatus !== 'OFFBOARDED'),
    [staff],
  );

  async function handleSave(staffMember: StaffMember): Promise<void> {
    setSavingStaffId(staffMember.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const saved = await saveAttendanceForStaff({
        existingRecord: attendanceByStaffId[staffMember.id] ?? null,
        staffId: staffMember.id,
        attendanceDate,
        status: draftStatus[staffMember.id] ?? 'ABSENT',
        remarks: draftRemarks[staffMember.id] || undefined,
      });

      setAttendanceByStaffId((current) => ({ ...current, [staffMember.id]: saved }));
      setSuccessMessage(`Saved attendance for ${getStaffDisplayName(staffMember)}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save attendance');
    } finally {
      setSavingStaffId(null);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Staff attendance"
        description="Mark and review daily attendance for your organization."
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Attendance date"
          type="date"
          value={attendanceDate}
          onChange={(event) => setAttendanceDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Department"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All departments</MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={department.id}>
              {department.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? <LoadingState label="Loading attendance" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      {!isLoading && activeStaff.length === 0 ? (
        <EmptyState message="No active staff members found for the selected filters." />
      ) : null}

      {!isLoading && activeStaff.length > 0 ? (
        <AppTable minWidth={880} aria-label="Attendance">
            <TableHead>
              <TableRow>
                <TableCell>Staff</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeStaff.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>{getStaffDisplayName(member)}</TableCell>
                  <TableCell>{member.department?.name ?? '—'}</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={draftStatus[member.id] ?? 'ABSENT'}
                      onChange={(event) =>
                        setDraftStatus((current) => ({
                          ...current,
                          [member.id]: event.target.value as AttendanceStatus,
                        }))
                      }
                    >
                      {ATTENDANCE_STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>
                          {formatAttendanceStatus(status)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={draftRemarks[member.id] ?? ''}
                      onChange={(event) =>
                        setDraftRemarks((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional note"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      disabled={savingStaffId === member.id}
                      onClick={() => void handleSave(member)}
                    >
                      {savingStaffId === member.id ? 'Saving…' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </AppTable>
      ) : null}
    </Stack>
  );
}
