'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  approveApprovalRequest,
  formatApprovalAction,
  formatApprovalEntityType,
  formatApprovalStatus,
  getApprovalHistory,
  getApprovalRequest,
  rejectApprovalRequest,
  type ApprovalAction,
  type ApprovalRequest,
} from '@/lib/approvals/approvals-client';

export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [history, setHistory] = useState<ApprovalAction[]>([]);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    const [loadedRequest, loadedHistory] = await Promise.all([
      getApprovalRequest(params.id),
      getApprovalHistory(params.id),
    ]);
    setRequest(loadedRequest);
    setHistory(loadedHistory);
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      setIsNotFound(false);

      try {
        if (!cancelled) {
          await reload();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else if (error instanceof ApiError && error.statusCode === 404) {
          setIsNotFound(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load approval request');
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
  }, [params.id, reload]);

  async function handleApprove(): Promise<void> {
    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await approveApprovalRequest(params.id, comment.trim() || undefined);
      setSuccessMessage('Approval recorded.');
      await reload();
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to approve request');
      }
    } finally {
      setIsActing(false);
    }
  }

  async function handleReject(): Promise<void> {
    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await rejectApprovalRequest(params.id, comment.trim() || undefined);
      setSuccessMessage('Rejection recorded.');
      await reload();
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to reject request');
      }
    } finally {
      setIsActing(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isNotFound) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">Approval request not found.</Alert>
        <Button component={Link} href="/approvals" variant="outlined">
          Back to approvals
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Approval details
          </Typography>
          <Typography color="text.secondary">
            Review request information, history, and take action.
          </Typography>
        </Box>
        <Button component={Link} href="/approvals" variant="outlined">
          Back to approvals
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading approval request" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      {!isLoading && request ? (
        <Stack spacing={3} maxWidth={720}>
          <Stack spacing={1}>
            <Typography>
              <strong>Entity:</strong> {formatApprovalEntityType(request.entityType)}
            </Typography>
            <Typography>
              <strong>Entity ID:</strong> {request.entityId}
            </Typography>
            <Typography component="div">
              <strong>Status:</strong>{' '}
              <StatusChip
                status={request.status}
                label={formatApprovalStatus(request.status)}
              />
            </Typography>
            <Typography>
              <strong>Current level:</strong> {request.currentLevelName ?? request.currentLevel}
            </Typography>
            <Typography>
              <strong>Current approver:</strong> {request.currentApproverSummary ?? '—'}
            </Typography>
            {request.entityType === 'LEAVE' ? (
              <Button component={Link} href="/leave" size="small" sx={{ alignSelf: 'flex-start' }}>
                Open leave queue
              </Button>
            ) : null}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">History</Typography>
            {history.length === 0 ? (
              <Typography color="text.secondary">No history recorded.</Typography>
            ) : (
              history.map((entry) => (
                <Typography key={entry.id}>
                  Level {entry.level}: {formatApprovalAction(entry.action)}
                  {entry.comment ? ` — ${entry.comment}` : ''}
                </Typography>
              ))
            )}
          </Stack>

          {request.status === 'PENDING' ? (
            <Stack spacing={2}>
              <TextField
                label="Comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                multiline
                minRows={2}
              />
              <Stack direction="row" spacing={2}>
                <Button variant="contained" disabled={isActing} onClick={() => void handleApprove()}>
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={isActing}
                  onClick={() => void handleReject()}
                >
                  Reject
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Alert severity="info">This approval request is complete.</Alert>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
