'use client';

import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AttendanceFeatureGate } from '@/components/features/AttendanceFeatureGate';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ReportExportCsvButton } from '@/components/ui/ReportExportCsvButton';
import { ReportFilterPanel } from '@/components/ui/ReportFilterPanel';
import {
  ATTENDANCE_STATUS_OPTIONS,
  formatAttendanceStatus,
  type AttendanceStatus,
} from '@/lib/attendance/attendance-client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { isAttendanceReportForbiddenError } from '@/lib/reports/attendance-report-errors';
import { getAttendanceReport, type AttendanceReport } from '@/lib/reports/attendance-reports-client';

function formatPercentage(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return `${value}%`;
}

function AttendanceReportPageContent() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date') ?? '';

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [date, setDate] = useState(initialDate);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [departmentError, setDepartmentError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    if (date) {
      return { date, departmentId: departmentId || undefined, status: status || undefined, page, pageSize: 25 };
    }
    return {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      departmentId: departmentId || undefined,
      status: status || undefined,
      page,
      pageSize: 25,
    };
  }, [date, departmentId, endDate, page, startDate, status]);

  useEffect(() => {
    void listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((response) => setDepartments(response.data))
      .catch((error) =>
        setDepartmentError(error instanceof Error ? error.message : 'Failed to load departments'),
      );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      try {
        const response = await getAttendanceReport(queryParams);
        if (!cancelled) {
          setReport(response);
        }
      } catch (error) {
        if (cancelled) return;
        if (isAttendanceReportForbiddenError(error)) {
          setIsForbidden(true);
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load attendance report',
          );
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
  }, [queryParams]);

  function updateFilter(setter: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  const summary = report?.summary;
  const isEmpty = !isLoading && report && report.data.length === 0;

  return (
    <Stack spacing={3}>
      <PageHeader
        icon={FactCheckOutlined}
        title="Attendance report"
        description="Staff attendance summary and records for your organization. Dates use your school calendar (organization timezone)."
        actions={
          <ReportExportCsvButton
            exportPath="/reports/attendance/export.csv"
            queryParams={queryParams}
            filename="attendance-report.csv"
            rowCount={report?.data.length ?? 0}
            onError={setErrorMessage}
          />
        }
      />

      <ReportFilterPanel>
        <TextField
          label="Date (single day)"
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setStartDate('');
            setEndDate('');
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
          helperText="Leave empty to use a range or today"
        />
        <TextField
          label="From"
          type="date"
          value={startDate}
          disabled={Boolean(date)}
          onChange={updateFilter(setStartDate)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          value={endDate}
          disabled={Boolean(date)}
          onChange={updateFilter(setEndDate)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Department"
          value={departmentId}
          onChange={updateFilter(setDepartmentId)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All departments</MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={department.id}>
              {department.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={status}
          onChange={updateFilter((value) => setStatus(value as AttendanceStatus | ''))}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {ATTENDANCE_STATUS_OPTIONS.map((item) => (
            <MenuItem key={item} value={item}>
              {formatAttendanceStatus(item)}
            </MenuItem>
          ))}
        </TextField>
      </ReportFilterPanel>

      {departmentError && <Alert severity="warning">{departmentError}</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : !report ? (
        <Alert severity="info">Attendance report is unavailable.</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            Period: {summary?.fromDate}
            {summary && summary.fromDate !== summary.toDate ? ` – ${summary.toDate}` : ''}
            {summary?.timezone ? ` (${summary.timezone})` : ''}
            {summary?.scope === 'single_day'
              ? ' · Single-day % = present ÷ active staff'
              : ' · Range % = present ÷ marked staff-days'}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Present</Typography>
                <Typography variant="h5">{summary?.present ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Absent</Typography>
                <Typography variant="h5">{summary?.absent ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Unmarked</Typography>
                <Typography variant="h5">
                  {summary?.unmarked === null ? '—' : summary?.unmarked ?? 0}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Attendance %</Typography>
                <Typography variant="h5">{formatPercentage(summary?.attendancePercentage ?? null)}</Typography>
              </CardContent>
            </Card>
          </Stack>

          {report.breakdown.byDepartment.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>By department</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Department</TableCell>
                    <TableCell>Marked</TableCell>
                    <TableCell>Present</TableCell>
                    <TableCell>Absent</TableCell>
                    <TableCell>% present (marked)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.breakdown.byDepartment.map((row) => (
                    <TableRow key={row.departmentId ?? 'unassigned'}>
                      <TableCell>{row.departmentName}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.present}</TableCell>
                      <TableCell>{row.absent}</TableCell>
                      <TableCell>{formatPercentage(row.attendancePercentage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : null}

          {isEmpty ? (
            <Alert severity="info">No staff attendance records match the selected filters.</Alert>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Staff</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Check-in</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.attendanceDate}</TableCell>
                      <TableCell>
                        {record.staffName}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {record.employeeCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.departmentName ?? '—'}</TableCell>
                      <TableCell>{formatAttendanceStatus(record.status)}</TableCell>
                      <TableCell>
                        {record.checkInAt
                          ? new Date(record.checkInAt).toLocaleString(undefined, {
                              timeZone: summary?.timezone ?? 'UTC',
                            })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {report.meta.totalPages > 1 && (
                <Pagination
                  count={report.meta.totalPages}
                  page={report.meta.page}
                  onChange={(_, nextPage) => setPage(nextPage)}
                />
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
}

export default function AttendanceReportPage() {
  return (
    <AttendanceFeatureGate>
      <AttendanceReportPageContent />
    </AttendanceFeatureGate>
  );
}
