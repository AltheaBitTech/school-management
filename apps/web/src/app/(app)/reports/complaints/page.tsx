'use client';

import BuildOutlined from '@mui/icons-material/BuildOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { AppTable, ResponsiveTable } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ReportExportCsvButton } from '@/components/ui/ReportExportCsvButton';
import { ReportFilterPanel } from '@/components/ui/ReportFilterPanel';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  formatComplaintCategory,
  formatComplaintPriority,
  formatComplaintStatus,
  type ComplaintCategory,
  type ComplaintPriority,
  type ComplaintStatus,
} from '@/lib/complaints/complaints-client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { isComplaintReportForbiddenError } from '@/lib/reports/complaint-report-errors';
import { getComplaintsReport, type ComplaintReport } from '@/lib/reports/complaints-reports-client';
import { listStaff, type StaffMember } from '@/lib/staff/staff-client';

function formatReportDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function ComplaintsReportPage() {
  const searchParams = useSearchParams();
  const initialOpenOnly = searchParams.get('openOnly') === 'true';

  const [report, setReport] = useState<ComplaintReport | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | ''>('');
  const [priority, setPriority] = useState<ComplaintPriority | ''>('');
  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [openOnly, setOpenOnly] = useState(initialOpenOnly);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const queryParams = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
      priority: priority || undefined,
      category: category || undefined,
      departmentId: departmentId || undefined,
      assigneeId: assigneeId || undefined,
      openOnly: openOnly || undefined,
      page,
      pageSize: 25,
    }),
    [
      assigneeId,
      category,
      departmentId,
      endDate,
      openOnly,
      page,
      priority,
      startDate,
      status,
    ],
  );

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
        const response = await getComplaintsReport(queryParams);
        if (!cancelled) {
          setReport(response);
        }
      } catch (error) {
        if (cancelled) return;
        if (isComplaintReportForbiddenError(error)) {
          setIsForbidden(true);
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load complaints report',
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
  const inProgressCount = summary?.inProgressComplaints ?? 0;

  return (
    <Stack spacing={3}>
      <PageHeader
        icon={BuildOutlined}
        title="Complaints report"
        description="Date filters apply to complaint createdAt in the organization timezone. Open complaints match the dashboard metric (OPEN, ASSIGNED, IN_PROGRESS, COMPLETED). Age uses days from creation to closedAt when CLOSED, otherwise to now. Ageing buckets count non-closed complaints only."
        actions={
          <ReportExportCsvButton
            exportPath="/reports/complaints/export.csv"
            queryParams={queryParams}
            filename="complaints-report.csv"
            rowCount={report?.data.length ?? 0}
            onError={setErrorMessage}
          />
        }
      />

      <ReportFilterPanel>
        <TextField
          label="From"
          type="date"
          value={startDate}
          onChange={updateFilter(setStartDate)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          value={endDate}
          onChange={updateFilter(setEndDate)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={updateFilter((value) => setStatus(value as ComplaintStatus | ''))}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {COMPLAINT_STATUSES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatComplaintStatus(item)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Priority"
          value={priority}
          onChange={updateFilter((value) => setPriority(value as ComplaintPriority | ''))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All priorities</MenuItem>
          {COMPLAINT_PRIORITIES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatComplaintPriority(item)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Category"
          value={category}
          onChange={updateFilter((value) => setCategory(value as ComplaintCategory | ''))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {COMPLAINT_CATEGORIES.map((item) => (
            <MenuItem key={item} value={item}>
              {formatComplaintCategory(item)}
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
          select
          label="Assignee"
          value={assigneeId}
          onChange={updateFilter(setAssigneeId)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All assignees</MenuItem>
          {staffMembers.map((staff) => (
            <MenuItem key={staff.id} value={staff.id}>
              {staff.displayName || `${staff.firstName} ${staff.lastName}`}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Open only"
          value={openOnly ? 'true' : 'false'}
          onChange={(event) => {
            setOpenOnly(event.target.value === 'true');
            setPage(1);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="false">No</MenuItem>
          <MenuItem value="true">Yes (dashboard open)</MenuItem>
        </TextField>
      </ReportFilterPanel>

      {filterError && <Alert severity="warning">{filterError}</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      {isLoading ? (
        <CircularProgress />
      ) : !report ? (
        <Alert severity="info">Complaints report is unavailable.</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            {summary?.dateFilterApplied
              ? `Created in period: ${summary.fromDate}${summary.toDate !== summary.fromDate ? ` – ${summary.toDate}` : ''} (${summary.timezone})`
              : 'No created-date filter (all matching complaints)'}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Total</Typography>
                <Typography variant="h5">{summary?.totalComplaints ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Open (dashboard)</Typography>
                <Typography variant="h5">{summary?.openComplaints ?? 0}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">In progress</Typography>
                <Typography variant="h5">{inProgressCount}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">High priority</Typography>
                <Typography variant="h5">{summary?.highPriorityComplaints ?? 0}</Typography>
              </CardContent>
            </Card>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            {report.breakdown.byStatus.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="h6">By status</Typography>
                <AppTable minWidth={240} aria-label="Complaints by status">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.breakdown.byStatus.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell>{formatComplaintStatus(row.status)}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AppTable>
              </Stack>
            ) : null}

            {report.breakdown.byPriority.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="h6">By priority</Typography>
                <AppTable minWidth={240} aria-label="Complaints by priority">
                  <TableHead>
                    <TableRow>
                      <TableCell>Priority</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.breakdown.byPriority.map((row) => (
                      <TableRow key={row.priority}>
                        <TableCell>{formatComplaintPriority(row.priority)}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AppTable>
              </Stack>
            ) : null}

            {report.breakdown.byCategory.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="h6">By category</Typography>
                <AppTable minWidth={240} aria-label="Complaints by category">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.breakdown.byCategory.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{formatComplaintCategory(row.category)}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AppTable>
              </Stack>
            ) : null}
          </Box>

          {report.breakdown.byDepartment.some((row) => row.total > 0) ? (
            <Box>
              <Typography variant="h6" gutterBottom>By department</Typography>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Department</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Open</TableCell>
                    <TableCell>Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.breakdown.byDepartment
                    .filter((row) => row.total > 0)
                    .map((row) => (
                      <TableRow key={row.departmentId ?? 'unassigned'}>
                        <TableCell>{row.departmentName}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell>{row.open}</TableCell>
                        <TableCell>{row.completed}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </ResponsiveTable>
            </Box>
          ) : null}

          {report.ageing.some((bucket) => bucket.count > 0) ? (
            <Box>
              <Typography variant="h6" gutterBottom>Ageing (non-closed)</Typography>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bucket</TableCell>
                    <TableCell>Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.ageing.map((bucket) => (
                    <TableRow key={bucket.key}>
                      <TableCell>{bucket.label}</TableCell>
                      <TableCell>{bucket.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
            </Box>
          ) : null}

          {isEmpty ? (
            <Alert severity="info">No complaints match the selected filters.</Alert>
          ) : (
            <>
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Complaint</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Age (days)</TableCell>
                    <TableCell>Closed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.title}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {record.complaintCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatComplaintCategory(record.category)}</TableCell>
                      <TableCell>
                        <StatusChip
                          status={record.priority}
                          label={formatComplaintPriority(record.priority)}
                        />
                      </TableCell>
                      <TableCell>{record.departmentName ?? '—'}</TableCell>
                      <TableCell>{record.assigneeName ?? '—'}</TableCell>
                      <TableCell>
                        <StatusChip
                          status={record.status}
                          label={formatComplaintStatus(record.status)}
                        />
                      </TableCell>
                      <TableCell>{formatReportDate(record.createdAt)}</TableCell>
                      <TableCell>{record.ageDays}</TableCell>
                      <TableCell>
                        {record.closedAt ? formatReportDate(record.closedAt) : '—'}
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
