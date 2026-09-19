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
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState, TablePaginationBar } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import {
  getStaffDisplayName,
  listStaff,
  type StaffMember,
} from '@/lib/staff/staff-client';

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

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
          sortBy: 'firstName',
          sortOrder: 'asc',
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
  }, [page, search, departmentId]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Staff"
        description="Manage school staff profiles for your organization."
        actions={
          <Button component={Link} href="/staff/new" variant="contained">
            Add staff
          </Button>
        }
      />

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

      {isLoading ? <LoadingState label="Loading staff" /> : null}

      {!isLoading && errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && !errorMessage && staff.length === 0 ? (
        <EmptyState message="No staff members found. Create the first staff profile to get started." />
      ) : null}

      {!isLoading && !errorMessage && staff.length > 0 ? (
        <AppTable aria-label="Staff">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Employee code</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Designation</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id} hover>
                <TableCell>{getStaffDisplayName(member)}</TableCell>
                <TableCell>{member.employeeCode}</TableCell>
                <TableCell>{member.department?.name ?? '—'}</TableCell>
                <TableCell>{member.designation ?? '—'}</TableCell>
                <TableCell>
                  <StatusChip status={member.employmentStatus} />
                </TableCell>
                <TableCell align="right">
                  <Button component={Link} href={`/staff/${member.id}`} size="small">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}

      {!isLoading ? (
        <TablePaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </Stack>
  );
}
