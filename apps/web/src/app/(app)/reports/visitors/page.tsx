'use client';

import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
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
import { StatusChip } from '@/components/ui/StatusChip';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { isVisitorReportForbiddenError } from '@/lib/reports/visitor-report-errors';
import { getVisitorsReport, type VisitorReport } from '@/lib/reports/visitors-reports-client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';
import {
  formatDateTime,
  formatVisitorStatus,
  VISITOR_STATUSES,
  type VisitorStatus,
} from '@/lib/visitors/visitors-client';
import { ResponsiveTable } from '@/components/ui/AppTable';

export default function VisitorsReportPage() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date') ?? '';

  const [report, setReport] = useState<VisitorReport | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [date, setDate] = useState(initialDate);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<VisitorStatus | ''>('');
  const [hostStaffId, setHostStaffId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    if (date) {
      return {
        date,
        status: status || undefined,
        hostStaffId: hostStaffId || undefined,
        departmentId: departmentId || undefined,
        purpose: purpose.trim() || undefined,
        page,
        pageSize: 25,
      };
    }
    return {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
      hostStaffId: hostStaffId || undefined,
      departmentId: departmentId || undefined,
      purpose: purpose.trim() || undefined,
      page,
      pageSize: 25,
    };
  }, [date, departmentId, endDate, hostStaffId, page, purpose, startDate, status]);

  useEffect(() => {
    void Promise.all([
      listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
      listStaff({ page: 1, pageSize: 100, employmentStatus: 'ACTIVE' }),
    ])
      .then(([departmentResponse, staffResponse]) => {
        setDepartments(departmentResponse.data);
        setStaffMembers(staffResponse.data);
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
        const response = await getVisitorsReport(queryParams);
        if (!cancelled) {
          setReport(response);
        }
      } catch (error) {
        if (cancelled) return;
        if (isVisitorReportForbiddenError(error)) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load visitor report');
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
        icon={BadgeOutlined}
        title="Visitor report"
        description="Date filters apply to visitor checkInAt in the organization timezone (same as the dashboard Visitors today metric). Visitor status uses VisitorStatus: CHECKED_IN means still on campus; CHECKED_OUT means checked out. Active on campus in the summary matches the dashboard count (organization-wide CHECKED_IN)."
        actions={
          <ReportExportCsvButton
            exportPath="/reports/visitors/export.csv"
            queryParams={queryParams}
            filename="visitors-report.csv"
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
          label="Status"
          value={status}
          onChange={updateFilter((value) => setStatus(value as VisitorStatus | ''))}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {VISITOR_STATUSES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatVisitorStatus(item)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Host"
          value={hostStaffId}
          onChange={updateFilter(setHostStaffId)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All hosts</MenuItem>
          {staffMembers.map((staff) => (
            <MenuItem key={staff.id} value={staff.id}>
              {getStaffDisplayName(staff)}
            </MenuItem>
          ))}
        </TextField>
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
          label="Purpose contains"
          value={purpose}
          onChange={updateFilter(setPurpose)}
          sx={{ minWidth: 200 }}
        />
      </ReportFilterPanel>

      {filterError && <Alert severity="warning">{filterError}</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : !report ? (
        <Alert severity="info">Visitor report is unavailable.</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            {summary?.dateFilterApplied
              ? `Check-in period: ${summary.fromDate}${summary.toDate !== summary.fromDate ? ` – ${summary.toDate}` : ''} (${summary.timezone})`
              : 'No check-in date filter (all matching visits)'}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Total visits</Typography>
                <Typography variant="h5">{summary?.totalVisits ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Checked in (in filter)</Typography>
                <Typography variant="h5">{summary?.checkedInVisits ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Checked out</Typography>
                <Typography variant="h5">{summary?.checkedOutVisits ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Active on campus</Typography>
                <Typography variant="h5">{summary?.activeOnCampus ?? 0}</Typography>
              </CardContent>
            </Card>
          </Stack>

          {report.breakdown.byStatus.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>By status</Typography>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.breakdown.byStatus.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell>{formatVisitorStatus(row.status)}</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
            </Box>
          ) : null}

          {report.breakdown.byPurpose.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>By purpose</Typography>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.breakdown.byPurpose.map((row) => (
                    <TableRow key={row.purpose}>
                      <TableCell>{row.purpose}</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
            </Box>
          ) : null}

          {report.breakdown.byHost.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>By host</Typography>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Host</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.breakdown.byHost.map((row) => (
                    <TableRow key={row.staffId}>
                      <TableCell>{row.staffName}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.active}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
            </Box>
          ) : null}

          {report.breakdown.byDepartment.some((row) => row.total > 0) ? (
            <Box>
              <Typography variant="h6" gutterBottom>By department</Typography>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Department</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.breakdown.byDepartment
                    .filter((row) => row.total > 0)
                    .map((row) => (
                      <TableRow key={row.departmentId ?? 'none'}>
                        <TableCell>{row.departmentName}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell>{row.active}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </ResponsiveTable>
            </Box>
          ) : null}

          {isEmpty ? (
            <Alert severity="info">No visitors match the selected filters.</Alert>
          ) : (
            <>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Visitor</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Host</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Visit date</TableCell>
                    <TableCell>Check-in</TableCell>
                    <TableCell>Check-out</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {record.visitorCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.mobile}</TableCell>
                      <TableCell>{record.purpose}</TableCell>
                      <TableCell>{record.hostName}</TableCell>
                      <TableCell>{record.departmentName ?? '—'}</TableCell>
                      <TableCell>{record.visitDate}</TableCell>
                      <TableCell>{formatDateTime(record.checkInAt)}</TableCell>
                      <TableCell>
                        {record.checkOutAt ? formatDateTime(record.checkOutAt) : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          status={record.status}
                          label={formatVisitorStatus(record.status)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
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
