'use client';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { formatAttendanceStatus } from '@/lib/attendance/attendance-client';
import {
  formatAttendanceTime,
  listStaffSelfAttendance,
  type StaffSelfAttendanceRecord,
} from '@/lib/staff-self/staff-self-client';

export default function StaffAttendancePage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [records, setRecords] = useState<StaffSelfAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listStaffSelfAttendance({
          page: 1,
          pageSize: 100,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        if (!cancelled) {
          setRecords(response.data);
        }
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader title="My attendance" description="Your attendance history for the selected period." />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="From date"
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label="To date"
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {isLoading ? (
        <LoadingState label="Loading attendance…" />
      ) : records.length === 0 ? (
        <EmptyState message="No attendance records for this period." />
      ) : (
        <AppTable>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Check in</TableCell>
              <TableCell>Check out</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.attendanceDate}</TableCell>
                <TableCell>
                  <StatusChip
                    status={record.status}
                    label={formatAttendanceStatus(record.status as never)}
                  />
                </TableCell>
                <TableCell>{formatAttendanceTime(record.checkInAt)}</TableCell>
                <TableCell>{formatAttendanceTime(record.checkOutAt)}</TableCell>
                <TableCell>{record.remarks ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      )}
    </Stack>
  );
}
