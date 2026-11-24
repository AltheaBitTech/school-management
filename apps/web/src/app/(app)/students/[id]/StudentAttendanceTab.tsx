'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppTable } from '@/components/ui/AppTable';
import { ApiError } from '@/lib/api/client';
import {
  formatStudentAttendanceStatus,
  getStudentAttendanceHistory,
  type StudentAttendanceHistory,
  type StudentAttendanceStatus,
} from '@/lib/student-attendance/student-attendance-client';

const STATUS_COLORS: Record<StudentAttendanceStatus, 'success' | 'error' | 'warning' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  HALF_DAY: 'warning',
  ON_LEAVE: 'info',
};

interface StudentAttendanceTabProps {
  studentId: string;
}

export function StudentAttendanceTab({ studentId }: StudentAttendanceTabProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [history, setHistory] = useState<StudentAttendanceHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    getStudentAttendanceHistory(studentId, { from: from || undefined, to: to || undefined })
      .then((result) => {
        if (cancelled) return;
        setHistory(result);
        // Show the server's default range in the pickers the first time.
        if (!from) setFrom(result.from);
        if (!to) setTo(result.to);
      })
      .catch((error) => {
        if (cancelled) return;
        setHistory(null);
        setErrorMessage(
          error instanceof ApiError && error.statusCode === 403
            ? 'You do not have permission to view this student’s attendance.'
            : error instanceof Error
              ? error.message
              : 'Attendance could not be loaded.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, from, to]);

  const summary = history?.summary;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
            <Typography variant="h6">Attendance</Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="From"
                type="date"
                size="small"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Stack>

          {isLoading ? <CircularProgress size={22} aria-label="Loading attendance" /> : null}
          {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}

          {!isLoading && summary ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                color="primary"
                label={`Attendance ${summary.percentage === null ? '—' : `${summary.percentage}%`}`}
              />
              <Chip variant="outlined" label={`Present ${summary.present}`} />
              <Chip variant="outlined" label={`Absent ${summary.absent}`} />
              <Chip variant="outlined" label={`Half day ${summary.halfDay}`} />
              <Chip variant="outlined" label={`On leave ${summary.onLeave}`} />
              <Chip variant="outlined" label={`Marked days ${summary.total}`} />
            </Stack>
          ) : null}

          {!isLoading && history && history.records.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No attendance was marked for this student in this period.
            </Typography>
          ) : null}

          {!isLoading && history && history.records.length > 0 ? (
            <AppTable aria-label="Attendance records" minWidth={480}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={STATUS_COLORS[record.status]}
                        label={formatStudentAttendanceStatus(record.status)}
                      />
                    </TableCell>
                    <TableCell>{record.sectionLabel}</TableCell>
                    <TableCell>{record.remarks?.trim() || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </AppTable>
          ) : null}

          <Stack direction="row">
            <Button component={Link} href="/attendance/students" variant="outlined">
              Open student attendance
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
