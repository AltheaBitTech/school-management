'use client';

import AddOutlined from '@mui/icons-material/AddOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState, TableIconLink } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { formatLeaveStatus, type LeaveRequest } from '@/lib/leave/leave-client';
import {
  listStaffSelfLeaveBalances,
  listStaffSelfLeaveRequests,
  type StaffSelfLeaveBalance,
} from '@/lib/staff-self/staff-self-client';

export default function StaffLeavePage() {
  const [balances, setBalances] = useState<StaffSelfLeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    void Promise.all([
      listStaffSelfLeaveBalances({ page: 1, pageSize: 50 }),
      listStaffSelfLeaveRequests({ page: 1, pageSize: 50 }),
    ])
      .then(([balanceResponse, requestResponse]) => {
        setBalances(balanceResponse.data);
        setRequests(requestResponse.data);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load leave data');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return <LoadingState label="Loading leave…" />;
  }

  return (
    <ListPageShell
      title="My leave"
      description="Balances and leave request history."
      icon={EventAvailableOutlined}
      actions={
        <Button component={Link} href="/staff/leave/new" variant="contained" startIcon={<AddOutlined />}>
          Submit leave
        </Button>
      }
    >

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Balances</Typography>
          {balances.length === 0 ? (
            <Typography color="text.secondary">No leave balances configured.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {balances.map((balance) => (
                <Typography key={balance.id}>
                  Available {balance.availableAmount} · Used {balance.usedAmount} · Pending{' '}
                  {balance.pendingAmount} ({balance.periodStart} – {balance.periodEnd})
                </Typography>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {requests.length === 0 ? (
        <EmptyState
          icon={EventAvailableOutlined}
          message="No leave requests yet."
          action={
            <Button component={Link} href="/staff/leave/new" variant="contained" startIcon={<AddOutlined />}>
              Submit leave
            </Button>
          }
        />
      ) : (
        <AppTable>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.leaveType?.name ?? 'Leave'}</TableCell>
                <TableCell>{request.startDate} – {request.endDate}</TableCell>
                <TableCell>
                  <StatusChip
                    status={request.status}
                    label={formatLeaveStatus(request.status)}
                  />
                </TableCell>
                <TableCell align="right">
                  <TableIconLink href={`/staff/leave/${request.id}`} label="View leave request" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      )}
    </ListPageShell>
  );
}
