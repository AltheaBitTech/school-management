'use client';

import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ManageSearchOutlined from '@mui/icons-material/ManageSearchOutlined';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { ReportFilterPanel } from '@/components/ui/ReportFilterPanel';
import { ApiError } from '@/lib/api/client';
import { listAuditLogs, type AuditLogRow } from '@/lib/audit/audit-client';

function formatTimestamp(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19);
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);
      try {
        const response = await listAuditLogs({
          page,
          pageSize: 25,
          action: action || undefined,
          entityType: entityType || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        if (!cancelled) {
          setLogs(response.data);
          setTotalPages(response.meta.totalPages);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load audit logs');
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
  }, [action, entityType, fromDate, page, toDate]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <ListPageShell
      title="Audit log"
      description="Read-only history of sensitive actions in your organization."
      icon={ManageSearchOutlined}
      filters={
        <ReportFilterPanel>
          <TextField
            label="Action"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Entity type"
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="From"
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </ReportFilterPanel>
      }
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {isLoading ? <LoadingState label="Loading audit entries" columnCount={5} minWidth={720} /> : null}
      {!isLoading && logs.length === 0 ? (
        <EmptyState icon={ManageSearchOutlined} message="No audit entries match your filters." />
      ) : null}
      {!isLoading && logs.length > 0 ? (
        <Stack spacing={2}>
          <AppTable minWidth={720} aria-label="Audit log">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Entity ID</TableCell>
                <TableCell>Actor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{formatTimestamp(log.createdAt)}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.entityId.slice(0, 8)}…
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.actorUserId.slice(0, 8)}…
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AppTable>
          {totalPages > 1 ? (
            <Pagination
              page={page}
              count={totalPages}
              onChange={(_event, value) => setPage(value)}
              color="primary"
            />
          ) : null}
        </Stack>
      ) : null}
    </ListPageShell>
  );
}
