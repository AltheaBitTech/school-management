'use client';

import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { AttendanceFeatureGate } from '@/components/features/AttendanceFeatureGate';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError, apiClient } from '@/lib/api/client';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { formatAttendanceStatus } from '@/lib/attendance/attendance-client';
import {
  formatAttendanceTime,
  listStaffSelfAttendance,
  type StaffSelfAttendanceRecord,
} from '@/lib/staff-self/staff-self-client';

function StaffAttendancePageContent() {
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
    <ListPageShell
      title="My attendance"
      description="Your attendance history for the selected period."
      icon={FactCheckOutlined}
      filters={
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
      }
    >
      <MyAttendanceQr />
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {isLoading ? (
        <LoadingState label="Loading attendance…" />
      ) : records.length === 0 ? (
        <EmptyState icon={FactCheckOutlined} message="No attendance records for this period." />
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
    </ListPageShell>
  );
}

export default function StaffAttendancePage() {
  return (
    <AttendanceFeatureGate>
      <StaffAttendancePageContent />
    </AttendanceFeatureGate>
  );
}

function MyAttendanceQr() {
  const [qr, setQr] = useState<{ qrCodeDataUrl: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void apiClient
      .get<{ data: { qrCodeDataUrl: string; expiresAt: string } }>('/me/attendance-qr', { auth: true })
      .then((response) => setQr(response.data))
      .catch(() => setMessage('Your attendance QR is available after your staff profile is linked.'));
  }, []);

  if (message) {
    return <Alert severity="info">{message}</Alert>;
  }
  if (!qr) {
    return <Skeleton variant="rounded" height={172} aria-label="Loading your attendance QR" />;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <Box component="img" src={qr.qrCodeDataUrl} alt="Your attendance QR code" sx={{ width: 140, height: 140 }} />
      <Stack spacing={0.5}>
        <Typography variant="h6">My QR</Typography>
        <Typography variant="body2" color="text.secondary">
          Show this at the desk. It expires {new Date(qr.expiresAt).toLocaleString()}.
        </Typography>
      </Stack>
    </Paper>
  );
}
