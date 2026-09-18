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
import {
  APPROVAL_STATUSES,
  formatApprovalEntityType,
  formatApprovalStatus,
  listApprovalRequests,
  type ApprovalRequest,
  type ApprovalRequestStatus,
} from '@/lib/approvals/approvals-client';

function statusColor(status: ApprovalRequestStatus): 'warning' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApprovalRequestStatus | ''>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listApprovalRequests({
          page: 1,
          pageSize: 100,
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
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load approvals');
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

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1">
          Approvals
        </Typography>
        <Typography color="text.secondary">
          Review pending approval requests and track approval status.
        </Typography>
      </Box>

      <TextField
        select
        label="Status"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as ApprovalRequestStatus | '')}
        sx={{ maxWidth: 240 }}
      >
        <MenuItem value="">All statuses</MenuItem>
        {APPROVAL_STATUSES.map((status) => (
          <MenuItem key={status} value={status}>
            {formatApprovalStatus(status)}
          </MenuItem>
        ))}
      </TextField>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading approvals" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && requests.length === 0 ? (
        <Alert severity="info">No approval requests found.</Alert>
      ) : null}

      {!isLoading && requests.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Entity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Current level</TableCell>
                <TableCell>Approver</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{formatApprovalEntityType(request.entityType)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatApprovalStatus(request.status)}
                      color={statusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{request.currentLevelName ?? request.currentLevel}</TableCell>
                  <TableCell>{request.currentApproverSummary ?? '—'}</TableCell>
                  <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/approvals/${request.id}`} size="small">
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
