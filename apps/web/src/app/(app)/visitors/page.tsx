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
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { getStaffDisplayName, listStaff, type StaffMember } from '@/lib/staff/staff-client';
import {
  formatDateTime,
  formatVisitorStatus,
  getVisitorStaffDisplayName,
  listVisitors,
  VISITOR_STATUSES,
  type Visitor,
  type VisitorStatus,
} from '@/lib/visitors/visitors-client';

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | ''>('CHECKED_IN');
  const [hostStaffId, setHostStaffId] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff(): Promise<void> {
      try {
        const response = await listStaff({
          page: 1,
          pageSize: 100,
          sortBy: 'firstName',
          sortOrder: 'asc',
          employmentStatus: 'ACTIVE',
        });
        if (!cancelled) {
          setStaff(response.data);
        }
      } catch {
        // Host filter is optional UX; list still works without staff options.
      }
    }

    void loadStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVisitors(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listVisitors({
          page: 1,
          pageSize: 25,
          status: statusFilter || undefined,
          hostStaffId: hostStaffId || undefined,
          date: date || undefined,
          search: search || undefined,
        });
        if (!cancelled) {
          setVisitors(response.data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load visitors');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadVisitors();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, hostStaffId, date, search]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Visitors"
        description="Register visitors, track current check-ins, and review visit history."
        actions={
          <Button component={Link} href="/visitors/new" variant="contained">
            Register visitor
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as VisitorStatus | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {VISITOR_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {formatVisitorStatus(status)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Host"
          value={hostStaffId}
          onChange={(event) => setHostStaffId(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All hosts</MenuItem>
          {staff.map((member) => (
            <MenuItem key={member.id} value={member.id}>
              {getStaffDisplayName(member)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, mobile, or code"
          sx={{ minWidth: 240 }}
        />
      </Stack>

      {isLoading ? <LoadingState label="Loading visitors" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && visitors.length === 0 ? (
        <EmptyState message="No visitors found for the selected filters." />
      ) : null}

      {!isLoading && visitors.length > 0 ? (
        <AppTable minWidth={960} aria-label="Visitors">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>Purpose</TableCell>
              <TableCell>Host</TableCell>
              <TableCell>Check-in</TableCell>
              <TableCell>Check-out</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visitors.map((visitor) => (
              <TableRow key={visitor.id} hover>
                <TableCell>{visitor.visitorCode}</TableCell>
                <TableCell>{visitor.name}</TableCell>
                <TableCell>{visitor.mobile}</TableCell>
                <TableCell>{visitor.purpose}</TableCell>
                <TableCell>
                  {visitor.hostStaff ? getVisitorStaffDisplayName(visitor.hostStaff) : '—'}
                </TableCell>
                <TableCell>{formatDateTime(visitor.checkInAt)}</TableCell>
                <TableCell>
                  {visitor.checkOutAt ? formatDateTime(visitor.checkOutAt) : '—'}
                </TableCell>
                <TableCell>
                  <StatusChip status={visitor.status} label={formatVisitorStatus(visitor.status)} />
                </TableCell>
                <TableCell align="right">
                  <Button component={Link} href={`/visitors/${visitor.id}`} size="small">
                    View
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
