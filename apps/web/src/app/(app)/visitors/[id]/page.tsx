'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import PersonPinOutlined from '@mui/icons-material/PersonPinOutlined';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { EmptyState } from '@/components/ui/AppTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailFactRow, DetailPageShell } from '@/components/ui/DetailPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  checkOutVisitor,
  formatDateTime,
  formatVisitDuration,
  formatVisitorStatus,
  getVisitor,
  getVisitorStaffDisplayName,
  type Visitor,
  type VisitorHistoryEntry,
} from '@/lib/visitors/visitors-client';

function formatHistoryEvent(eventType: string): string {
  return eventType === 'CHECKED_IN' ? 'Checked in' : 'Checked out';
}

const EVENT_STYLE = {
  CHECKED_IN: { icon: LoginOutlined, tone: 'success' },
  CHECKED_OUT: { icon: LogoutOutlined, tone: 'primary' },
} as const;

function toneTint(tone: string, opacity: number): string {
  return `rgba(var(--mui-palette-${tone}-mainChannel) / ${opacity})`;
}

function SectionTitle({ icon: Icon, title, trailing }: { icon: React.ElementType; title: string; trailing?: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ pb: 1.5, mb: 0.5, borderBottom: 1, borderColor: 'divider' }}
    >
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          borderRadius: '10px',
          bgcolor: 'primary.light',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Typography variant="h6" component="h2" sx={{ flexGrow: 1, fontSize: '1.0625rem' }}>
        {title}
      </Typography>
      {trailing}
    </Stack>
  );
}

function VisitHistoryTimeline({ entries }: { entries: VisitorHistoryEntry[] }) {
  const ordered = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <Box component="ol" aria-label="Visit history" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {ordered.map((entry, index) => {
        const style = EVENT_STYLE[entry.eventType] ?? EVENT_STYLE.CHECKED_IN;
        const EventIcon = style.icon;
        const isLast = index === ordered.length - 1;

        return (
          <Box component="li" key={entry.id} sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 } }}>
            {/* Rail: icon with a connecting line to the next event */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <Box
                aria-hidden
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: toneTint(style.tone, 0.12),
                  border: '1px solid',
                  borderColor: toneTint(style.tone, 0.3),
                  color: `${style.tone}.main`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EventIcon sx={{ fontSize: 18 }} />
              </Box>
              {!isLast ? (
                <Box aria-hidden sx={{ flex: 1, width: 2, my: 0.5, minHeight: 16, bgcolor: 'divider', borderRadius: 1 }} />
              ) : null}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 2.5, pt: 0.75 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'baseline' }}
                spacing={{ xs: 0.25, sm: 2 }}
              >
                <Typography sx={{ fontWeight: 650 }}>{formatHistoryEvent(entry.eventType)}</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="time"
                  dateTime={entry.createdAt}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}
                >
                  <AccessTimeOutlined sx={{ fontSize: 15 }} aria-hidden />
                  {formatDateTime(entry.createdAt)}
                </Typography>
              </Stack>
              {entry.actorUser ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, minWidth: 0 }}
                >
                  <PersonOutlined sx={{ fontSize: 15, flexShrink: 0 }} aria-hidden />
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    by {entry.actorUser.email}
                  </Box>
                </Typography>
              ) : null}
              {entry.comment ? (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: '10px',
                    bgcolor: 'action.hover',
                    borderLeft: '3px solid',
                    borderLeftColor: toneTint(style.tone, 0.5),
                    wordBreak: 'break-word',
                  }}
                >
                  {entry.comment}
                </Typography>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
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
            <SectionTitle icon={BadgeOutlined} title="Visitor information" />
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
            <SectionTitle icon={AssignmentOutlined} title="Visit details" />
            <DetailFactRow label="Purpose">{visitor.purpose}</DetailFactRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <SectionTitle
            icon={HistoryOutlined}
            title="Visit history"
            trailing={
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {visitor.history && visitor.history.length > 0 ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${visitor.history.length} ${visitor.history.length === 1 ? 'event' : 'events'}`}
                  />
                ) : null}
                {visitor.status === 'CHECKED_OUT' && visitor.checkOutAt && formatVisitDuration(visitor.checkInAt, visitor.checkOutAt) ? (
                  <Chip
                    size="small"
                    icon={<AccessTimeOutlined />}
                    label={`Visit lasted ${formatVisitDuration(visitor.checkInAt, visitor.checkOutAt)}`}
                    sx={{ bgcolor: 'primary.light', color: 'primary.main', '& .MuiChip-icon': { color: 'inherit' } }}
                  />
                ) : null}
                {visitor.status === 'CHECKED_IN' ? (
                  <Chip
                    size="small"
                    label="On campus now"
                    icon={
                      <Box
                        component="span"
                        aria-hidden
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          ml: '8px !important',
                          animation: 'visitPulse 1.6s ease-in-out infinite',
                          '@keyframes visitPulse': {
                            '0%, 100%': { boxShadow: `0 0 0 0 ${toneTint('success', 0.5)}` },
                            '50%': { boxShadow: `0 0 0 5px ${toneTint('success', 0)}` },
                          },
                        }}
                      />
                    }
                    sx={{ bgcolor: toneTint('success', 0.12), color: 'success.main' }}
                  />
                ) : null}
              </Stack>
            }
          />
          <Box sx={{ pt: 2 }}>
            {visitor.history && visitor.history.length > 0 ? (
              <VisitHistoryTimeline entries={visitor.history} />
            ) : (
              <EmptyState icon={HistoryOutlined} message="No history recorded for this visit yet." />
            )}
          </Box>
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
