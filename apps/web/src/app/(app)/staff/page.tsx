'use client';

import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddOutlined from '@mui/icons-material/AddOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StaffImportDialog } from '@/app/(app)/staff/StaffImportDialog';
import { useOptionalAuthSession } from '@/components/providers/AuthSessionProvider';
import { useCan, useCanEvery } from '@/lib/auth/use-can';
import { AssignAdditionalRole } from '@/components/rbac/AssignAdditionalRole';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState, TableIconLink, TablePaginationBar } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import {
  downloadStaffImportSampleCsv,
  getStaffDisplayName,
  getStaffInitials,
  listStaff,
  type StaffMember,
} from '@/lib/staff/staff-client';

type StaffSort = 'name' | 'employeeCode' | 'joiningDate';

function staffSortParams(sort: StaffSort): {
  sortBy: 'firstName' | 'employeeCode' | 'joiningDate';
  sortOrder: 'asc' | 'desc';
} {
  if (sort === 'employeeCode') {
    return { sortBy: 'employeeCode', sortOrder: 'asc' };
  }
  if (sort === 'joiningDate') {
    return { sortBy: 'joiningDate', sortOrder: 'desc' };
  }
  return { sortBy: 'firstName', sortOrder: 'asc' };
}

export default function StaffListPage() {
  const session = useOptionalAuthSession();
  const canCreate = useCan('staff.create');
  const canImport = useCanEvery(['staff.create', 'role.assign']);
  const canAssignRole = useCan('role.assign');
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sort, setSort] = useState<StaffSort>('name');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments(): Promise<void> {
      try {
        const response = await listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' });
        if (!cancelled) {
          setDepartments(response.data);
        }
      } catch {
        // Department filter is optional; ignore failures here.
      }
    }

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listStaff({
          page,
          pageSize: 10,
          search: search.trim() || undefined,
          departmentId: departmentId || undefined,
          ...staffSortParams(sort),
        });

        if (!cancelled) {
          setStaff(response.data);
          setTotalPages(response.meta.totalPages);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setIsForbidden(true);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load staff');
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
  }, [page, search, departmentId, sort, refreshKey]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <>
      <ListPageShell
        title="Staff"
        description="Manage staff profiles for your organization."
        icon={PeopleAltOutlined}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {canCreate ? (
              <Button
                variant="outlined"
                startIcon={<DownloadOutlined />}
                onClick={() => void downloadStaffImportSampleCsv()}
              >
                Download sample CSV
              </Button>
            ) : null}
            {canImport ? (
              <Button
                variant="outlined"
                startIcon={<UploadFileOutlined />}
                onClick={() => setImportDialogOpen(true)}
              >
                Import CSV
              </Button>
            ) : null}
            {canCreate ? (
              <Button component={Link} href="/staff/new" variant="contained" startIcon={<AddOutlined />}>
                Add staff
              </Button>
            ) : null}
            {canAssignRole ? (
              <AssignAdditionalRole
                userId={session?.user?.id}
                label="Assign a role to my account"
              />
            ) : null}
          </Stack>
        }
        filters={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Name, code, or email"
              fullWidth
            />
            <TextField
              select
              label="Sort"
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value as StaffSort);
              }}
              sx={{ minWidth: { md: 180 } }}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="employeeCode">Employee code</MenuItem>
              <MenuItem value="joiningDate">Joining date</MenuItem>
            </TextField>
            <TextField
              select
              label="Department"
              value={departmentId}
              onChange={(event) => {
                setPage(1);
                setDepartmentId(event.target.value);
              }}
              sx={{ minWidth: { md: 220 } }}
            >
              <MenuItem value="">All departments</MenuItem>
              {departments.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
        footer={
          !isLoading ? (
            <TablePaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : null
        }
      >
        {isLoading ? <LoadingState label="Loading staff" columnCount={6} /> : null}

        {!isLoading && errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {!isLoading && !errorMessage && staff.length === 0 ? (
          <EmptyState
            icon={PeopleAltOutlined}
            message={
              canCreate
                ? 'No staff members found. Create the first staff profile to get started.'
                : 'No staff members found.'
            }
            action={
              canCreate ? (
                <Button component={Link} href="/staff/new" variant="contained" startIcon={<AddOutlined />}>
                  Add staff
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {!isLoading && !errorMessage && staff.length > 0 && isCompact ? (
          <Stack spacing={1.5} aria-label="Staff">
            {staff.map((member) => (
              <Card key={member.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.dark', width: 40, height: 40, fontSize: 14 }}>
                      {getStaffInitials(member)}
                    </Avatar>
                    <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {getStaffDisplayName(member)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {member.employeeCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {member.email ?? 'No email'}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <StatusChip status={member.employmentStatus} />
                      <TableIconLink href={`/staff/${member.id}`} label="View staff" />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : null}

        {!isLoading && !errorMessage && staff.length > 0 && !isCompact ? (
          <AppTable aria-label="Staff">
            <TableHead>
              <TableRow>
                <TableCell>Staff</TableCell>
                <TableCell>Employee code</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Designation</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.dark', width: 36, height: 36, fontSize: 13 }}>
                        {getStaffInitials(member)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getStaffDisplayName(member)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{member.employeeCode}</TableCell>
                  <TableCell>{member.email ?? '—'}</TableCell>
                  <TableCell>{member.department?.name ?? '—'}</TableCell>
                  <TableCell>{member.designation ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={member.employmentStatus} />
                  </TableCell>
                  <TableCell align="right">
                    <TableIconLink href={`/staff/${member.id}`} label="View staff" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AppTable>
        ) : null}
      </ListPageShell>

      <StaffImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={() => setRefreshKey((value) => value + 1)}
      />
    </>
  );
}
