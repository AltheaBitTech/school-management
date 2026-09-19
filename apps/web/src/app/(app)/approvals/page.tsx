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
import {
  APPROVAL_STATUSES,
  formatApprovalEntityType,
  formatApprovalStatus,
  listApprovalRequests,
  type ApprovalRequest,
  type ApprovalRequestStatus,
} from '@/lib/approvals/approvals-client';

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
      <PageHeader
        title="Approvals"
        description="Review pending approval requests and track approval status."
      />

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

      {isLoading ? <LoadingState label="Loading approvals" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && requests.length === 0 ? (
        <EmptyState message="No approval requests found." />
      ) : null}

      {!isLoading && requests.length > 0 ? (
        <AppTable aria-label="Approvals">
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
              <TableRow key={request.id} hover>
                <TableCell>{formatApprovalEntityType(request.entityType)}</TableCell>
                <TableCell>
                  <StatusChip
                    status={request.status}
                    label={formatApprovalStatus(request.status)}
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
        </AppTable>
      ) : null}
    </Stack>
  );
}
