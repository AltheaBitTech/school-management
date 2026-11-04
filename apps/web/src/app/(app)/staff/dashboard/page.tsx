'use client';

import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import HourglassEmptyOutlined from '@mui/icons-material/HourglassEmptyOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { DashboardSkeleton } from '@/components/home/DashboardWidgets';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { isAttendanceEnabled } from '@/lib/features/feature-flags';
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
    return <DashboardSkeleton />;
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
        icon={DashboardOutlined}
        actions={
          <Button component={Link} href="/staff/leave/new" variant="contained">
            Submit leave
          </Button>
        }
      />

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {isAttendanceEnabled() ? (
          <StatTile
            label="Today's attendance"
            value={formatTodayStatus(dashboard.todayAttendance?.status ?? null)}
            detail={dashboard.localDate}
            href="/staff/attendance"
            hrefLabel="View attendance"
            icon={EventAvailableOutlined}
            tone="success"
          />
        ) : null}
        <StatTile
          label="Pending leave requests"
          value={String(dashboard.pendingLeaveRequestCount)}
          href="/staff/leave"
          hrefLabel="My leave"
          icon={HourglassEmptyOutlined}
          tone="warning"
        />
        <StatTile
          label="Unread notifications"
          value={String(dashboard.unreadNotificationCount)}
          icon={NotificationsNoneOutlined}
          tone="primary"
        />
      </Box>

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
