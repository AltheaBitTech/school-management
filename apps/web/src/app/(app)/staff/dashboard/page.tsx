'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { formatLeaveStatus, type LeaveRequestStatus } from '@/lib/leave/leave-client';
import {
  formatStaffDisplayName,
  getStaffSelfDashboard,
  type StaffSelfDashboard,
} from '@/lib/staff-self/staff-self-client';

function formatTodayStatus(status: string | null): string {
  if (!status) {
    return 'Not marked';
  }
  return status.replace(/_/g, ' ');
}

export default function StaffDashboardPage() {
  const [dashboard, setDashboard] = useState<StaffSelfDashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void getStaffSelfDashboard()
      .then(setDashboard)
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load dashboard');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return <LoadingState label="Loading your dashboard…" />;
  }

  if (!dashboard) {
    return <Alert severity="error">{errorMessage ?? 'Dashboard is unavailable'}</Alert>;
  }

  const staffName = formatStaffDisplayName(dashboard.staff);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My dashboard"
        description={`Welcome back, ${staffName}.`}
      />

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Today&apos;s attendance</Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {formatTodayStatus(dashboard.todayAttendance.status)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {dashboard.localDate}
            </Typography>
            <Button component={Link} href="/staff/attendance" size="small" sx={{ mt: 2 }}>
              View attendance
            </Button>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Pending leave requests</Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {dashboard.pendingLeaveRequestCount}
            </Typography>
            <Button component={Link} href="/staff/leave" size="small" sx={{ mt: 2 }}>
              My leave
            </Button>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Unread notifications</Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {dashboard.unreadNotificationCount}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Leave balances</Typography>
          {dashboard.leaveBalances.length === 0 ? (
            <Typography color="text.secondary">No leave balances configured yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {dashboard.leaveBalances.map((balance) => (
                <Stack
                  key={balance.leaveTypeId}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography>{balance.leaveTypeName}</Typography>
                  <Typography color="text.secondary">
                    {balance.availableAmount} available · {balance.usedAmount} used ·{' '}
                    {balance.pendingAmount} pending
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Recent leave requests</Typography>
            <Button component={Link} href="/staff/leave/new" variant="contained" size="small">
              Submit leave
            </Button>
          </Stack>
          {dashboard.recentLeaveRequests.length === 0 ? (
            <Typography color="text.secondary">No leave requests yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {dashboard.recentLeaveRequests.map((request) => (
                <Stack
                  key={request.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={1}
                >
                  <BoxLink requestId={request.id} label={`${request.leaveTypeName} · ${request.startDate} – ${request.endDate}`} />
                  <StatusChip
                    status={request.status}
                    label={formatLeaveStatus(request.status as LeaveRequestStatus)}
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

function BoxLink({ requestId, label }: { requestId: string; label: string }) {
  return (
    <Typography
      component={Link}
      href={`/staff/leave/${requestId}`}
      sx={{ textDecoration: 'none', color: 'text.primary', fontWeight: 500 }}
    >
      {label}
    </Typography>
  );
}
