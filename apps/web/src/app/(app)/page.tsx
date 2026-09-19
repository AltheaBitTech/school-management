'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/AppTable';
import { listApprovalRequests } from '@/lib/approvals/approvals-client';
import { listComplaints } from '@/lib/complaints/complaints-client';
import { listEvents } from '@/lib/events/events-client';
import { formatCurrency, listStudentFees } from '@/lib/fees/fees-client';
import { listLeaveRequests } from '@/lib/leave/leave-client';
import {
  countUnreadNotifications,
  listNotifications,
} from '@/lib/notifications/notifications-client';
import { listStaff } from '@/lib/staff/staff-client';
import { listStudents } from '@/lib/students/students-client';
import { listVisitors } from '@/lib/visitors/visitors-client';

interface DashboardMetric {
  label: string;
  href: string;
  value: string;
}

interface AttentionItem {
  label: string;
  href: string;
  detail: string;
}

async function loadTotal(
  loader: () => Promise<{ meta: { total: number } }>,
): Promise<number | null> {
  try {
    const response = await loader();
    return response.meta.total;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const { isReady, isAuthenticated, user } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard(): Promise<void> {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated) {
        setMetrics([]);
        setAttention([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [
          staffTotal,
          studentsTotal,
          complaintsTotal,
          visitorsTotal,
          eventsTotal,
          feesResponse,
          pendingLeave,
          pendingApprovals,
          notifications,
        ] = await Promise.all([
          loadTotal(() => listStaff({ page: 1, pageSize: 1 })),
          loadTotal(() => listStudents({ page: 1, pageSize: 1 })),
          loadTotal(() => listComplaints({ page: 1, pageSize: 1 })),
          loadTotal(() => listVisitors({ page: 1, pageSize: 1 })),
          loadTotal(() => listEvents({ page: 1, pageSize: 1 })),
          listStudentFees({ page: 1, pageSize: 25 }).catch(() => null),
          loadTotal(() => listLeaveRequests({ page: 1, pageSize: 1, status: 'PENDING_APPROVAL' })),
          loadTotal(() => listApprovalRequests({ page: 1, pageSize: 1, status: 'PENDING' })),
          listNotifications({ page: 1, pageSize: 10 }).catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        const nextMetrics: DashboardMetric[] = [];
        if (staffTotal !== null) {
          nextMetrics.push({ label: 'Staff', href: '/staff', value: String(staffTotal) });
        }
        if (studentsTotal !== null) {
          nextMetrics.push({ label: 'Students', href: '/students', value: String(studentsTotal) });
        }
        if (complaintsTotal !== null) {
          nextMetrics.push({
            label: 'Complaints',
            href: '/complaints',
            value: String(complaintsTotal),
          });
        }
        if (visitorsTotal !== null) {
          nextMetrics.push({ label: 'Visitors', href: '/visitors', value: String(visitorsTotal) });
        }
        if (eventsTotal !== null) {
          nextMetrics.push({ label: 'Events', href: '/events', value: String(eventsTotal) });
        }
        if (feesResponse) {
          const outstanding = feesResponse.data.reduce(
            (total, studentFee) => total + studentFee.outstandingAmount,
            0,
          );
          nextMetrics.push({
            label: 'Outstanding (recent assignments)',
            href: '/fees/student-fees',
            value: formatCurrency(outstanding),
          });
        }
        setMetrics(nextMetrics);

        const nextAttention: AttentionItem[] = [];
        if (pendingLeave !== null && pendingLeave > 0) {
          nextAttention.push({
            label: 'Leave requests',
            href: '/leave',
            detail: `${pendingLeave} pending approval`,
          });
        }
        if (pendingApprovals !== null && pendingApprovals > 0) {
          nextAttention.push({
            label: 'Approvals',
            href: '/approvals',
            detail: `${pendingApprovals} pending`,
          });
        }
        if (notifications) {
          const unread = countUnreadNotifications(notifications.data);
          if (unread > 0) {
            nextAttention.push({
              label: 'Notifications',
              href: '/leave',
              detail: `${unread} unread`,
            });
          }
        }
        setAttention(nextAttention);
      } catch {
        if (!cancelled) {
          setMetrics([]);
          setAttention([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isReady]);

  if (!isReady || isLoading) {
    return <LoadingState label="Loading dashboard" />;
  }

  if (!user) {
    return (
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <PageHeader
          title="CampusOps"
          description="School operations management for staff, students, leave, fees, and campus workflows."
        />
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography sx={{ mb: 2 }}>
            Sign in to open the operational dashboard for your school.
          </Typography>
          <Button component={Link} href="/login" variant="contained">
            Sign in
          </Button>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Dashboard"
        description={`Operational overview for ${user.organization?.name ?? 'your school'}. Counts come from records you can already access.`}
        actions={
          <Button component={Link} href="/staff" variant="contained">
            Open staff
          </Button>
        }
      />

      {metrics.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          }}
        >
          {metrics.map((metric) => (
            <Card key={metric.href + metric.label} variant="outlined">
              <CardActionArea component={Link} href={metric.href} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    {metric.label}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.75 }}>
                    {metric.value}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No module counts are available for this account yet. Use the navigation to open the
            areas you have permission to manage.
          </Typography>
        </Paper>
      )}

      {attention.length > 0 ? (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Needs attention
          </Typography>
          <Stack spacing={1.25}>
            {attention.map((item) => (
              <Stack
                key={item.label}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.detail}
                  </Typography>
                </Box>
                <Button component={Link} href={item.href} size="small">
                  Review
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Common actions
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={Link} href="/students" variant="outlined" size="small">
            Students
          </Button>
          <Button component={Link} href="/leave/new" variant="outlined" size="small">
            Submit leave
          </Button>
          <Button component={Link} href="/approvals" variant="outlined" size="small">
            Approvals
          </Button>
          <Button component={Link} href="/fees/student-fees" variant="outlined" size="small">
            Student fees
          </Button>
          <Button component={Link} href="/complaints" variant="outlined" size="small">
            Complaints
          </Button>
          <Button component={Link} href="/visitors" variant="outlined" size="small">
            Visitors
          </Button>
          <Button component={Link} href="/events" variant="outlined" size="small">
            Events
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
