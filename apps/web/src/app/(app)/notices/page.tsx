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
import AddOutlined from '@mui/icons-material/AddOutlined';
import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  formatNoticeStatus,
  listNotices,
  NOTICE_STATUSES,
  type Notice,
  type NoticeStatus,
} from '@/lib/notices/notices-client';

export default function NoticesPage() {
  const canCreate = useCan('notice.create');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [statusFilter, setStatusFilter] = useState<NoticeStatus | ''>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNotices(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listNotices({
          page: 1,
          pageSize: 25,
          status: statusFilter || undefined,
          search: search || undefined,
        });
        if (!cancelled) {
          setNotices(response.data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load notices');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNotices();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, search]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <ListPageShell
      title="Notices"
      description="Publish notices and circulars to targeted audiences."
      icon={AnnouncementOutlined}
      actions={
        canCreate ? (
          <Button component={Link} href="/notices/new" variant="contained" startIcon={<AddOutlined />}>
            New notice
          </Button>
        ) : undefined
      }
      filters={
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as NoticeStatus | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {NOTICE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {formatNoticeStatus(status)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 240 }}
        />
      </Stack>
      }
    >
      {isLoading ? <LoadingState label="Loading notices" columnCount={5} /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && notices.length === 0 ? (
        <EmptyState
          icon={AnnouncementOutlined}
          message={
            canCreate
              ? 'No notices found for the selected filters.'
              : 'No notices found for the selected filters. Publishing a notice is not part of this role.'
          }
          action={
            canCreate ? (
              <Button component={Link} href="/notices/new" variant="contained" startIcon={<AddOutlined />}>
                New notice
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && notices.length > 0 ? (
        <AppTable aria-label="Notices">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Published</TableCell>
              <TableCell>Scheduled</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notices.map((notice) => (
              <TableRow key={notice.id} hover>
                <TableCell>{notice.title}</TableCell>
                <TableCell>
                  <StatusChip status={notice.status} label={formatNoticeStatus(notice.status)} />
                </TableCell>
                <TableCell>
                  {notice.publishedAt ? new Date(notice.publishedAt).toLocaleString() : '—'}
                </TableCell>
                <TableCell>
                  {notice.scheduledAt ? new Date(notice.scheduledAt).toLocaleString() : '—'}
                </TableCell>
                <TableCell align="right">
                  <Button component={Link} href={`/notices/${notice.id}`} size="small">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </ListPageShell>
  );
}
