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
  acknowledgeNotice,
  archiveNotice,
  formatAudienceLabel,
  formatNoticeStatus,
  getNotice,
  isEditableNoticeStatus,
  markNoticeRead,
  publishNotice,
  type Notice,
} from '@/lib/notices/notices-client';

export default function NoticeDetailPage() {
  const params = useParams<{ id: string }>();
  const noticeId = params.id;

  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const data = await getNotice(noticeId);
        if (!cancelled) {
          setNotice(data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load notice');
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
  }, [noticeId]);

  async function runAction(action: () => Promise<Notice>, success: string): Promise<void> {
    setIsActing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await action();
      setNotice(updated);
      setSuccessMessage(success);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsActing(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading notice" />
      </Box>
    );
  }

  if (!notice) {
    return <Alert severity="error">{errorMessage ?? 'Notice not found.'}</Alert>;
  }

  const canEdit = isEditableNoticeStatus(notice.status);
  const canPublish = notice.status === 'DRAFT' || notice.status === 'SCHEDULED';
  const canArchive = notice.status === 'PUBLISHED';
  const canRead = notice.status === 'PUBLISHED';
  const isRead = Boolean(notice.readState?.readAt);
  const isAcknowledged = Boolean(notice.readState?.acknowledgedAt);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            {notice.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <StatusChip
              status={notice.status}
              label={formatNoticeStatus(notice.status)}
            />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          {canEdit ? (
            <Button component={Link} href={`/notices/${notice.id}/edit`} variant="outlined">
              Edit
            </Button>
          ) : null}
          <Button component={Link} href="/notices">
            Back to list
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography whiteSpace="pre-wrap">{notice.content}</Typography>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2">Audience</Typography>
            <Typography color="text.secondary">
              {notice.audiences.map(formatAudienceLabel).join(', ')}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Timeline</Typography>
            <Typography color="text.secondary">
              Created: {new Date(notice.createdAt).toLocaleString()}
            </Typography>
            {notice.createdBy ? (
              <Typography color="text.secondary">Creator: {notice.createdBy.email}</Typography>
            ) : null}
            {notice.scheduledAt ? (
              <Typography color="text.secondary">
                Scheduled: {new Date(notice.scheduledAt).toLocaleString()}
              </Typography>
            ) : null}
            {notice.publishedAt ? (
              <Typography color="text.secondary">
                Published: {new Date(notice.publishedAt).toLocaleString()}
              </Typography>
            ) : null}
            {notice.archivedAt ? (
              <Typography color="text.secondary">
                Archived: {new Date(notice.archivedAt).toLocaleString()}
              </Typography>
            ) : null}
          </Stack>

          {notice.readState ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Your status</Typography>
              <Typography color="text.secondary">
                Read: {new Date(notice.readState.readAt).toLocaleString()}
              </Typography>
              {notice.readState.acknowledgedAt ? (
                <Typography color="text.secondary">
                  Acknowledged: {new Date(notice.readState.acknowledgedAt).toLocaleString()}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {canPublish ? (
              <Button
                variant="contained"
                disabled={isActing}
                onClick={() => void runAction(() => publishNotice(notice.id), 'Notice published.')}
              >
                Publish
              </Button>
            ) : null}
            {canArchive ? (
              <Button
                variant="outlined"
                color="warning"
                disabled={isActing}
                onClick={() => void runAction(() => archiveNotice(notice.id), 'Notice archived.')}
              >
                Archive
              </Button>
            ) : null}
            {canRead && !isRead ? (
              <Button
                variant="outlined"
                disabled={isActing}
                onClick={() => void runAction(() => markNoticeRead(notice.id), 'Marked as read.')}
              >
                Mark read
              </Button>
            ) : null}
            {canRead && isRead && !isAcknowledged ? (
              <Button
                variant="contained"
                color="success"
                disabled={isActing}
                onClick={() =>
                  void runAction(() => acknowledgeNotice(notice.id), 'Notice acknowledged.')
                }
              >
                Acknowledge
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
