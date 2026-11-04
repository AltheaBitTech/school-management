'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PersonPinOutlined from '@mui/icons-material/PersonPinOutlined';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailFactRow, DetailPageShell } from '@/components/ui/DetailPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
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
  const canCheckout = useCan('visitor.checkout');
  const params = useParams<{ id: string }>();
  const visitorId = params.id;
  const { showSuccess } = useAppSnackbar();

  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);

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
    if (!visitor) {
      return;
    }

    setIsActing(true);
    setErrorMessage(null);

    try {
      await checkOutVisitor(visitor.id);
      await reloadVisitor();
      showSuccess('Visitor checked out');
      setCheckoutConfirmOpen(false);
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
    <>
    <DetailPageShell
      title={visitor.name}
      description={`${visitor.visitorCode} · ${visitor.mobile}`}
      icon={PersonPinOutlined}
      actions={
        <>
          <Button component={Link} href="/visitors" variant="outlined">
            Back to list
          </Button>
          {visitor.status === 'CHECKED_IN' || visitor.status === 'CHECKED_OUT' ? (
            <Button
              component={Link}
              href={`/visitors/${visitor.id}/pass`}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
            >
              Print pass
            </Button>
          ) : null}
          {canCheckout && visitor.status === 'CHECKED_IN' ? (
            <Button variant="contained" color="warning" disabled={isActing} onClick={() => setCheckoutConfirmOpen(true)}>
              {isActing ? 'Checking out…' : 'Check out'}
            </Button>
          ) : null}
        </>
      }
      meta={
        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary">
            Visit status
          </Typography>
          <DetailFactRow label="Status">
            <StatusChip status={visitor.status} label={formatVisitorStatus(visitor.status)} />
          </DetailFactRow>
          <DetailFactRow label="Check-in">{formatDateTime(visitor.checkInAt)}</DetailFactRow>
          <DetailFactRow label="Check-out">
            {visitor.checkOutAt ? formatDateTime(visitor.checkOutAt) : '—'}
          </DetailFactRow>
          <DetailFactRow label="Host">
            {visitor.hostStaff ? getVisitorStaffDisplayName(visitor.hostStaff) : visitor.hostStaffId}
          </DetailFactRow>
        </Stack>
      }
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Visitor information</Typography>
            <DetailFactRow label="Name">{visitor.name}</DetailFactRow>
            <DetailFactRow label="Mobile">{visitor.mobile}</DetailFactRow>
            <DetailFactRow label="Organization">{visitor.organizationName || '—'}</DetailFactRow>
            <DetailFactRow label="Vehicle">{visitor.vehicleNumber || '—'}</DetailFactRow>
            <DetailFactRow label="Remarks">{visitor.remarks || '—'}</DetailFactRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">Visit details</Typography>
            <DetailFactRow label="Purpose">{visitor.purpose}</DetailFactRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
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
        </CardContent>
      </Card>
    </DetailPageShell>

    <ConfirmDialog
      open={checkoutConfirmOpen}
      title="Check out visitor?"
      description="This ends the active visit. You can still print the pass from history if needed."
      confirmLabel="Check out"
      confirmColor="warning"
      isConfirming={isActing}
      onCancel={() => setCheckoutConfirmOpen(false)}
      onConfirm={() => void handleCheckOut()}
    />
    </>
  );
}
