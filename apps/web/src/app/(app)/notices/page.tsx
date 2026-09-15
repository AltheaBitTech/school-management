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
  formatNoticeStatus,
  listNotices,
  NOTICE_STATUSES,
  type Notice,
  type NoticeStatus,
} from '@/lib/notices/notices-client';

function statusColor(status: NoticeStatus): 'default' | 'warning' | 'success' | 'info' {
  switch (status) {
    case 'PUBLISHED':
      return 'success';
    case 'SCHEDULED':
      return 'info';
    case 'ARCHIVED':
      return 'default';
    default:
      return 'warning';
  }
}

export default function NoticesPage() {
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
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Notices
          </Typography>
          <Typography color="text.secondary">
            Publish school notices and circulars to targeted audiences.
          </Typography>
        </Box>
        <Button component={Link} href="/notices/new" variant="contained">
          New notice
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading notices" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && notices.length === 0 ? (
        <Alert severity="info">No notices found for the selected filters.</Alert>
      ) : null}

      {!isLoading && notices.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
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
                    <Chip
                      size="small"
                      label={formatNoticeStatus(notice.status)}
                      color={statusColor(notice.status)}
                    />
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
          </Table>
        </Box>
      ) : null}
    </Stack>
  );
}
