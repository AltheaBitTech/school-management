'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import {
  approveLeaveRequest,
  formatLeaveStatus,
  getStaffDisplayNameFromLeave,
  listLeaveRequests,
  rejectLeaveRequest,
  type LeaveRequest,
  type LeaveRequestStatus,
} from '@/lib/leave/leave-client';

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | ''>('PENDING_APPROVAL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listLeaveRequests({
          page: 1,
          pageSize: 25,
          status: statusFilter || undefined,
        });
        if (!cancelled) {
          setRequests(response.data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load leave requests');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  async function handleApprove(requestId: string): Promise<void> {
    setActingOnId(requestId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await approveLeaveRequest(requestId);
      setSuccessMessage('Leave request approved.');
      const response = await listLeaveRequests({
        page: 1,
        pageSize: 25,
        status: statusFilter || undefined,
      });
      setRequests(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to approve leave request');
    } finally {
      setActingOnId(null);
    }
  }

  async function handleReject(requestId: string): Promise<void> {
    setActingOnId(requestId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await rejectLeaveRequest(requestId);
      setSuccessMessage('Leave request rejected.');
      const response = await listLeaveRequests({
        page: 1,
        pageSize: 25,
        status: statusFilter || undefined,
      });
      setRequests(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reject leave request');
    } finally {
      setActingOnId(null);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Leave requests
          </Typography>
          <Typography color="text.secondary">
            Review pending leave and track request decisions.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/leave/new" variant="contained">
            New request
          </Button>
          <Button component={Link} href="/leave/types" variant="outlined">
            Leave types
          </Button>
        </Stack>
      </Stack>

      <TextField
        select
        label="Status"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as LeaveRequestStatus | '')}
        sx={{ maxWidth: 260 }}
      >
        <MenuItem value="">All statuses</MenuItem>
        <MenuItem value="PENDING_APPROVAL">Pending approval</MenuItem>
        <MenuItem value="APPROVED">Approved</MenuItem>
        <MenuItem value="REJECTED">Rejected</MenuItem>
      </TextField>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading leave requests" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      {!isLoading && requests.length === 0 ? (
        <Alert severity="info">No leave requests found for the selected filter.</Alert>
      ) : null}

      {!isLoading && requests.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Staff</TableCell>
                <TableCell>Leave type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>{getStaffDisplayNameFromLeave(request.staff)}</TableCell>
                  <TableCell>{request.leaveType?.name ?? '—'}</TableCell>
                  <TableCell>
                    {request.startDate}
                    {request.endDate !== request.startDate ? ` → ${request.endDate}` : ''}
                  </TableCell>
                  <TableCell>{request.duration}</TableCell>
                  <TableCell>{formatLeaveStatus(request.status)}</TableCell>
                  <TableCell align="right">
                    {request.status === 'PENDING_APPROVAL' ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="contained"
                          disabled={actingOnId === request.id}
                          onClick={() => void handleApprove(request.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          disabled={actingOnId === request.id}
                          onClick={() => void handleReject(request.id)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    ) : (
                      '—'
                    )}
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
