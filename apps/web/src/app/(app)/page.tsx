'use client';

import { useEffect, useState } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import Alert from '@mui/material/Alert';
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
import { LoadingState } from '@/components/ui/AppTable';
import {
  formatDashboardDate,
  getDashboardSummary,
  getGreetingLabel,
  type DashboardSummary,
} from '@/lib/dashboard/dashboard-client';
import { formatCurrency } from '@/lib/fees/fees-client';
import { formatEventDateTime } from '@/lib/events/events-client';

interface SummaryCardProps {
  label: string;
  value: string;
  href: string;
}

function SummaryCard({ label, value, href }: SummaryCardProps) {
  return (
    <Card variant="outlined">
      <CardActionArea component={Link} href={href} sx={{ height: '100%' }}>
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.75 }}>
            {value}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function SectionPaper({
  title,
  children,
  emptyMessage,
  isEmpty,
}: {
  title: string;
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {isEmpty ? (
        <Typography color="text.secondary" variant="body2">
          {emptyMessage ?? 'Nothing to show yet.'}
        </Typography>
      ) : (
        children
      )}
    </Paper>
  );
}

export default function HomePage() {
  const { isReady, isAuthenticated, user } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard(): Promise<void> {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated) {
        setSummary(null);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getDashboardSummary();
        if (!cancelled) {
          setSummary(response);
        }
      } catch (error) {
        if (!cancelled) {
          setSummary(null);
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load dashboard');
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
  }, [isReady, isAuthenticated]);

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

        <Container maxWidth="md" sx={{ flex: 1, py: { xs: 6, md: 10 } }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
              Comprehensive School Management System
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 6 }}>
              Streamline operations, enhance communication, and elevate your school&apos;s efficiency.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ mb: 8 }}>
            <Paper sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                New School?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Register your school to get started with CampusOps.
              </Typography>
              <Button component={Link} href="/register-organization" variant="contained" size="large" sx={{ mt: 'auto' }}>
                Register School
              </Button>
            </Paper>
            <Paper sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Already a Member?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Sign in with your organization code, email, and password.
              </Typography>
              <Button component={Link} href="/login" variant="outlined" size="large" sx={{ mt: 'auto' }}>
                Sign In
              </Button>
            </Paper>
          </Stack>
        </Container>
      </Box>
    );
  }

  if (!isReady || isLoading) {
    return <LoadingState label="Loading dashboard" />;
  }

  if (!user) {
    return (
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography sx={{ mb: 2 }}>Sign in to open the operational dashboard for your school.</Typography>
          <Button component={Link} href="/login" variant="contained">
            Sign in
          </Button>
        </Paper>
      </Stack>
    );
  }

  if (errorMessage) {
    return (
      <Stack spacing={3}>
        <Alert severity="error">{errorMessage}</Alert>
        <Button component={Link} href="/staff" variant="contained">
          Open staff
        </Button>
      </Stack>
    );
  }

  if (!summary) {
    return (
      <Stack spacing={3}>
        <Alert severity="info">Dashboard data is unavailable for this account.</Alert>
      </Stack>
    );
  }

  const metrics = summary.metrics;
  const summaryCards: SummaryCardProps[] = [];

  if (metrics.students !== null) {
    summaryCards.push({ label: 'Students', value: String(metrics.students), href: '/students' });
  }
  if (metrics.activeStaff !== null) {
    summaryCards.push({ label: 'Active staff', value: String(metrics.activeStaff), href: '/staff' });
  }
  if (metrics.todayAttendance !== null) {
    summaryCards.push({
      label: "Today's attendance",
      value: `${metrics.todayAttendance.present} present`,
      href: `/reports/attendance?date=${metrics.todayAttendance.date}`,
    });
  }
  if (metrics.outstandingFees !== null) {
    summaryCards.push({
      label: 'Outstanding fees',
      value: formatCurrency(metrics.outstandingFees.totalOutstanding),
      href: '/reports/fees',
    });
  }

  const operationsItems = [
    metrics.pendingLeave !== null
      ? {
          label: 'Pending leave',
          value: metrics.pendingLeave,
          href: '/reports/leave?status=PENDING_APPROVAL',
        }
      : null,
    metrics.pendingApprovals !== null
      ? { label: 'Pending approvals', value: metrics.pendingApprovals, href: '/approvals' }
      : null,
    metrics.openComplaints !== null
      ? {
          label: 'Open complaints',
          value: metrics.openComplaints,
          href: '/reports/complaints?openOnly=true',
        }
      : null,
    metrics.visitorsToday !== null
      ? {
          label: 'Visitors today',
          value: metrics.visitorsToday.checkedInToday,
          href: `/reports/visitors?date=${summary.localDate}`,
          detail: `${metrics.visitorsToday.activeOnCampus} currently on campus`,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" component="h1">
          {getGreetingLabel(summary.greetingPeriod)}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {summary.organization.name}
        </Typography>
        <Typography color="text.secondary">
          {formatDashboardDate(summary.localDate, summary.organization.timezone)}
        </Typography>
      </Stack>

      {summaryCards.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          }}
        >
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No summary metrics are available for this account yet.
          </Typography>
        </Paper>
      )}

      {operationsItems.length > 0 ? (
        <SectionPaper title="Operations">
          <Stack spacing={1.25}>
            {operationsItems.map((item) => (
              <Stack
                key={item.label}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.detail ?? `${item.value} requiring attention`}
                  </Typography>
                </Box>
                <Button component={Link} href={item.href} size="small">
                  Review
                </Button>
              </Stack>
            ))}
          </Stack>
        </SectionPaper>
      ) : null}

      {(metrics.upcomingEvents !== null || metrics.recentNotices !== null) && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          }}
        >
          {metrics.upcomingEvents !== null ? (
            <SectionPaper
              title="Upcoming events"
              isEmpty={metrics.upcomingEvents.length === 0}
              emptyMessage="No upcoming scheduled events."
            >
              <Stack spacing={1.25}>
                {metrics.upcomingEvents.map((event) => (
                  <Box key={event.id}>
                    <Typography sx={{ fontWeight: 600 }}>{event.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatEventDateTime(event.startAt, summary.organization.timezone)}
                      {event.venueName ? ` · ${event.venueName}` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </SectionPaper>
          ) : null}

          {metrics.recentNotices !== null ? (
            <SectionPaper
              title="Recent notices"
              isEmpty={metrics.recentNotices.length === 0}
              emptyMessage="No published notices yet."
            >
              <Stack spacing={1.25}>
                {metrics.recentNotices.map((notice) => (
                  <Box key={notice.id}>
                    <Typography sx={{ fontWeight: 600 }}>{notice.title}</Typography>
                    {notice.publishedAt ? (
                      <Typography variant="body2" color="text.secondary">
                        Published {formatEventDateTime(notice.publishedAt, summary.organization.timezone)}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            </SectionPaper>
          ) : null}
        </Box>
      )}

      {metrics.unreadNotifications !== null ? (
        <SectionPaper
          title="Activity"
          isEmpty={metrics.unreadNotifications === 0}
          emptyMessage="No unread notifications."
        >
          <Typography>
            {metrics.unreadNotifications} unread notification
            {metrics.unreadNotifications === 1 ? '' : 's'}
          </Typography>
        </SectionPaper>
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
