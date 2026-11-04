'use client';

import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
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
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ReportExportCsvButton } from '@/components/ui/ReportExportCsvButton';
import { ReportFilterPanel } from '@/components/ui/ReportFilterPanel';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import {
  formatLeaveStatus,
  listLeaveTypes,
  type LeaveRequestStatus,
  type LeaveType,
} from '@/lib/leave/leave-client';
import { isLeaveReportForbiddenError } from '@/lib/reports/leave-report-errors';
import { getLeaveReport, type LeaveReport } from '@/lib/reports/leave-reports-client';

const LEAVE_STATUSES: LeaveRequestStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

export default function LeaveReportPage() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get('status') as LeaveRequestStatus | null) ?? '';

  const [report, setReport] = useState<LeaveReport | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [status, setStatus] = useState<LeaveRequestStatus | ''>(initialStatus);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    if (date) {
      return {
        date,
        departmentId: departmentId || undefined,
        leaveTypeId: leaveTypeId || undefined,
        status: status || undefined,
        page,
        pageSize: 25,
      };
    }
    return {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      departmentId: departmentId || undefined,
      leaveTypeId: leaveTypeId || undefined,
      status: status || undefined,
      page,
      pageSize: 25,
    };
  }, [date, departmentId, endDate, leaveTypeId, page, startDate, status]);

  useEffect(() => {
    void Promise.all([
      listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
      listLeaveTypes({ page: 1, pageSize: 100 }),
    ])
      .then(([departmentResponse, leaveTypeResponse]) => {
        setDepartments(departmentResponse.data);
        setLeaveTypes(leaveTypeResponse.data);
      })
      .catch((error) =>
        setFilterError(error instanceof Error ? error.message : 'Failed to load filters'),
      );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      try {
        const response = await getLeaveReport(queryParams);
        if (!cancelled) {
          setReport(response);
        }
      } catch (error) {
        if (cancelled) return;
        if (isLeaveReportForbiddenError(error)) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load leave report');
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
        icon={EventBusyOutlined}
        title="Leave report"
        description="Staff leave requests use LeaveRequest.status as the source of truth. Date filters match leave periods that overlap the selected range."
        actions={
          <ReportExportCsvButton
            exportPath="/reports/leave/export.csv"
            queryParams={queryParams}
            filename="leave-report.csv"
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
          label="Leave type"
          value={leaveTypeId}
          onChange={updateFilter(setLeaveTypeId)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All leave types</MenuItem>
          {leaveTypes.map((leaveType) => (
            <MenuItem key={leaveType.id} value={leaveType.id}>
              {leaveType.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={status}
          onChange={updateFilter((value) => setStatus(value as LeaveRequestStatus | ''))}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {LEAVE_STATUSES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatLeaveStatus(item)}
            </MenuItem>
          ))}
        </TextField>
      </ReportFilterPanel>

      {filterError && <Alert severity="warning">{filterError}</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : !report ? (
        <Alert severity="info">Leave report is unavailable.</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            {summary?.dateFilterApplied
              ? `Period overlap: ${summary.fromDate}${summary.toDate !== summary.fromDate ? ` – ${summary.toDate}` : ''} (${summary.timezone})`
              : `No leave-period date filter (showing matching requests across all dates)`}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Pending</Typography>
                <Typography variant="h5">{summary?.pending ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Approved</Typography>
                <Typography variant="h5">{summary?.approved ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Rejected</Typography>
                <Typography variant="h5">{summary?.rejected ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">On leave (approved)</Typography>
                <Typography variant="h5">{summary?.employeesOnLeave ?? 0}</Typography>
              </CardContent>
            </Card>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Approved leave days in filter: {summary?.leaveDaysApproved ?? 0}
          </Typography>

          {report.breakdown.byDepartment.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>By department</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Department</TableCell>
                    <TableCell>Requests</TableCell>
                    <TableCell>Pending</TableCell>
                    <TableCell>Approved</TableCell>
                    <TableCell>Rejected</TableCell>
                    <TableCell>Leave days</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.breakdown.byDepartment.map((row) => (
                    <TableRow key={row.departmentId ?? 'unassigned'}>
                      <TableCell>{row.departmentName}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.pending}</TableCell>
                      <TableCell>{row.approved}</TableCell>
                      <TableCell>{row.rejected}</TableCell>
                      <TableCell>{row.leaveDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : null}

          {report.balances && report.balances.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>Leave balances (selected staff)</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell>Allocated</TableCell>
                    <TableCell>Used</TableCell>
                    <TableCell>Pending</TableCell>
                    <TableCell>Available</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.balances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell>{balance.periodStart} – {balance.periodEnd}</TableCell>
                      <TableCell>{balance.allocatedAmount}</TableCell>
                      <TableCell>{balance.usedAmount}</TableCell>
                      <TableCell>{balance.pendingAmount}</TableCell>
                      <TableCell>{balance.availableAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : null}

          {isEmpty ? (
            <Alert severity="info">No leave requests match the selected filters.</Alert>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Leave type</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Days</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Approval</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.staffName}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {record.employeeCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.departmentName ?? '—'}</TableCell>
                      <TableCell>{record.leaveTypeName}</TableCell>
                      <TableCell>{record.startDate}</TableCell>
                      <TableCell>{record.endDate}</TableCell>
                      <TableCell>{record.duration}</TableCell>
                      <TableCell>{formatLeaveStatus(record.status)}</TableCell>
                      <TableCell>{record.approvalStatus ?? '—'}</TableCell>
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
