'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  checkOutVisitor,
  formatDateTime,
  formatVisitorStatus,
  getVisitor,
  getVisitorStaffDisplayName,
  type Visitor,
} from '@/lib/visitors/visitors-client';

function formatHistoryEvent(eventType: string): string {
  return eventType === 'CHECKED_IN' ? 'Checked in' : 'Checked out';
}

export default function VisitorDetailPage() {
  const params = useParams<{ id: string }>();
  const visitorId = params.id;

  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  async function reloadVisitor(): Promise<void> {
    const data = await getVisitor(visitorId);
    setVisitor(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      setIsNotFound(false);

      try {
        const data = await getVisitor(visitorId);
        if (!cancelled) {
          setVisitor(data);
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
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load visitor');
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
  }, [visitorId]);

  async function handleCheckOut(): Promise<void> {
    if (!visitor || visitor.status !== 'CHECKED_IN') {
      return;
    }

    const confirmed = window.confirm('Check out this visitor now?');
    if (!confirmed) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await checkOutVisitor(visitor.id);
      await reloadVisitor();
      setSuccessMessage('Visitor checked out.');
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        setErrorMessage('Visitor is already checked out or checkout is no longer available.');
        await reloadVisitor().catch(() => undefined);
      } else if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to check out visitor');
      }
    } finally {
      setIsActing(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isNotFound) {
    return <Alert severity="warning">Visitor not found.</Alert>;
  }

  if (isLoading || !visitor) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading visitor" />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            {visitor.name}
          </Typography>
          <Typography color="text.secondary">
            {visitor.visitorCode} · {visitor.mobile}
          </Typography>
        </Box>
        <Button component={Link} href="/visitors" variant="outlined">
          Back to list
        </Button>
      </Stack>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Visitor information</Typography>
          <Typography>Name: {visitor.name}</Typography>
          <Typography>Mobile: {visitor.mobile}</Typography>
          <Typography>Organization: {visitor.organizationName || '—'}</Typography>
          <Typography>Vehicle number: {visitor.vehicleNumber || '—'}</Typography>
          <Typography>Remarks: {visitor.remarks || '—'}</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Visit information</Typography>
          <Typography>Purpose: {visitor.purpose}</Typography>
          <Typography>
            Host:{' '}
            {visitor.hostStaff ? getVisitorStaffDisplayName(visitor.hostStaff) : visitor.hostStaffId}
          </Typography>
          <Typography>Check-in: {formatDateTime(visitor.checkInAt)}</Typography>
          <Typography>
            Check-out: {visitor.checkOutAt ? formatDateTime(visitor.checkOutAt) : '—'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography>Status:</Typography>
            <StatusChip
              status={visitor.status}
              label={formatVisitorStatus(visitor.status)}
            />
          </Stack>
        </Stack>
      </Paper>

      {visitor.status === 'CHECKED_IN' ? (
        <Box>
          <Button variant="contained" color="warning" disabled={isActing} onClick={handleCheckOut}>
            {isActing ? 'Checking out…' : 'Check out visitor'}
          </Button>
        </Box>
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">History</Typography>
          <Divider />
          {visitor.history && visitor.history.length > 0 ? (
            visitor.history.map((entry) => (
              <Box key={entry.id}>
                <Typography fontWeight={600}>{formatHistoryEvent(entry.eventType)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(entry.createdAt)}
                  {entry.actorUser ? ` · ${entry.actorUser.email}` : ''}
                </Typography>
                {entry.comment ? (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {entry.comment}
                  </Typography>
                ) : null}
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">No history recorded yet.</Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
