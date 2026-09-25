'use client';

import { useEffect, useState } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/AppTable';
import { listApprovalRequests } from '@/lib/approvals/approvals-client';
import { listComplaints } from '@/lib/complaints/complaints-client';
import { listEvents } from '@/lib/events/events-client';
import { listLeaveRequests } from '@/lib/leave/leave-client';
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

  // Initialize useEffect before conditional returns
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
          pendingLeave,
          pendingApprovals,
        ] = await Promise.all([
          loadTotal(() => listStaff({ page: 1, pageSize: 1 })),
          loadTotal(() => listStudents({ page: 1, pageSize: 1 })),
          loadTotal(() => listComplaints({ page: 1, pageSize: 1 })),
          loadTotal(() => listVisitors({ page: 1, pageSize: 1 })),
          loadTotal(() => listEvents({ page: 1, pageSize: 1 })),
          loadTotal(() => listLeaveRequests({ page: 1, pageSize: 1, status: 'PENDING_APPROVAL' })),
          loadTotal(() => listApprovalRequests({ page: 1, pageSize: 1, status: 'PENDING' })),
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
        if (visitorsTotal !== null) {
          nextMetrics.push({
            label: 'Visitors',
            href: '/visitors',
            value: String(visitorsTotal),
          });
        }
        if (eventsTotal !== null) {
          nextMetrics.push({ label: 'Events', href: '/events', value: String(eventsTotal) });
        }

        const nextAttention: AttentionItem[] = [];
        if (complaintsTotal !== null && complaintsTotal > 0) {
          nextAttention.push({
            label: `${complaintsTotal} Complaint${complaintsTotal > 1 ? 's' : ''}`,
            href: '/complaints',
            detail: 'Pending Review',
          });
        }
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

        setMetrics(nextMetrics);
        setAttention(nextAttention);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated]);

  // Show public landing page for unauthenticated users
  if (isReady && !isAuthenticated) {
    return (
      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        {/* Header */}
        <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 3 }}>
          <Container maxWidth="md">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ fontSize: 32, fontWeight: 700 }}>📚</Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                CampusOps
              </Typography>
            </Stack>
          </Container>
        </Box>

        {/* Main Content */}
        <Container maxWidth="md" sx={{ flex: 1, py: { xs: 6, md: 10 } }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
              Comprehensive School Management System
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 6 }}>
              Streamline operations, enhance communication, and elevate your school&apos;s efficiency.
            </Typography>
          </Box>

          {/* Action Cards */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={4}
            sx={{ mb: 8 }}
          >
            {/* New School */}
            <Paper
              sx={{
                flex: 1,
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                '&:hover': { boxShadow: 6 },
                transition: 'box-shadow 0.3s',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                New School?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Register your school to get started with CampusOps. Our team will review your application and contact you within 1–2 business days.
              </Typography>
              <Button
                component={Link}
                href="/register-organization"
                variant="contained"
                size="large"
                sx={{ mt: 'auto' }}
              >
                Register School
              </Button>
            </Paper>

            {/* Existing School */}
            <Paper
              sx={{
                flex: 1,
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                '&:hover': { boxShadow: 6 },
                transition: 'box-shadow 0.3s',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Already a Member?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Sign in with your school&apos;s organization code, email, and password to access the CampusOps dashboard.
              </Typography>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                size="large"
                sx={{ mt: 'auto' }}
              >
                Sign In
              </Button>
            </Paper>
          </Stack>

          {/* Features */}
          <Box sx={{ bgcolor: 'grey.50', p: 4, borderRadius: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
              Key Features
            </Typography>
            <Box
              component="ul"
              sx={{
                listStyle: 'none',
                p: 0,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
              }}
            >
              {[
                'Student Information Management',
                'Attendance Tracking',
                'Fee Management',
                'Event Management',
                'Staff Directory',
                'Leave Management',
                'Document Generation',
                'Visitor Management',
              ].map((feature) => (
                <Box component="li" key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 24, height: 24, bgcolor: 'primary.main', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                    ✓
                  </Box>
                  <Typography>{feature}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>

        {/* Footer */}
        <Box sx={{ bgcolor: 'grey.100', py: 3, mt: 8, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="body2">
            © 2024 CampusOps. All rights reserved.
          </Typography>
        </Box>
      </Box>
    );
  }


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
