'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
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

function statusColor(status: VisitorStatus): 'success' | 'default' {
  return status === 'CHECKED_IN' ? 'success' : 'default';
}

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
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Visitors
          </Typography>
          <Typography color="text.secondary">
            Register visitors, track current check-ins, and review visit history.
          </Typography>
        </Box>
        <Button component={Link} href="/visitors/new" variant="contained">
          Register visitor
        </Button>
      </Stack>

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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading visitors" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && visitors.length === 0 ? (
        <Alert severity="info">No visitors found for the selected filters.</Alert>
      ) : null}

      {!isLoading && visitors.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
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
                <TableRow key={visitor.id}>
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
                    <Chip
                      label={formatVisitorStatus(visitor.status)}
                      color={statusColor(visitor.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/visitors/${visitor.id}`} size="small">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}
    </Stack>
  );
}
