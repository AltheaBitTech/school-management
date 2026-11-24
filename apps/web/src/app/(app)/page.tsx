'use client';

import AddOutlined from '@mui/icons-material/AddOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import { useEffect, useState } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { apiClient } from '@/lib/api/client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { ElementType } from 'react';
import {
  DashboardMetricGrid,
  DashboardQuickActions,
  DashboardSkeleton,
  STAT_TONES,
  type DashboardMetricCardProps,
  type QuickActionItem,
} from '@/components/home/DashboardWidgets';
import { PublicLandingPage } from '@/components/home/PublicLandingPage';
import { HomeWelcomeHero } from '@/components/home/HomeWelcomeHero';
import { StatTile } from '@/components/ui/StatTile';
import { PlatformHomeContent } from '@/components/home/PlatformHomeContent';
import { hasPermission, isOperationalDashboardUser } from '@/lib/auth/routing';
import { isAttendanceEnabled } from '@/lib/features/feature-flags';
import {
  formatDashboardDate,
  getDashboardSummary,
  getGreetingLabel,
  type DashboardSummary,
} from '@/lib/dashboard/dashboard-client';
import { isPlatformOrganization } from '@/lib/navigation/platform';
import { formatCurrency } from '@/lib/fees/fees-client';
import { formatEventDateTime } from '@/lib/events/events-client';

interface SummaryCardProps {
  label: string;
  value: string;
  href: string;
  icon: ElementType;
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

function buildQuickActions(permissions: string[] | undefined): QuickActionItem[] {
  const actions: QuickActionItem[] = [];
  if (hasPermission(permissions, 'staff.create')) {
    actions.push({ label: 'Add staff', href: '/staff/new', icon: AddOutlined });
  }
  if (hasPermission(permissions, 'visitor.create')) {
    actions.push({ label: 'Register visitor', href: '/visitors/new', icon: BadgeOutlined });
  }
  if (hasPermission(permissions, 'complaint.create')) {
    actions.push({ label: 'Log complaint', href: '/complaints/new', icon: BuildOutlined });
  }
  if (hasPermission(permissions, 'approval.view')) {
    actions.push({ label: 'Review approvals', href: '/approvals', icon: TaskAltOutlined });
  }
  if (hasPermission(permissions, 'notice.create')) {
    actions.push({ label: 'Publish notice', href: '/notices/new', icon: AnnouncementOutlined });
  }
  return actions;
}

function TrendBars({
  days,
}: {
  days: NonNullable<DashboardSummary['metrics']['trends']>;
}) {
  const maxFee = Math.max(...days.map((day) => day.feeCollected ?? 0), 1);
  const maxAttendance = Math.max(...days.map((day) => day.attendancePresent ?? 0), 1);
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Last 7 days</Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Fee collection
          </Typography>
          <Stack spacing={0.75}>
            {days.map((day) => (
              <Stack key={`fee-${day.date}`} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ width: 72 }}>
                  {day.date.slice(5)}
                </Typography>
                <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 1, height: 8 }}>
                  <Box
                    sx={{
                      width: `${Math.round(((day.feeCollected ?? 0) / maxFee) * 100)}%`,
                      bgcolor: 'primary.main',
                      height: 8,
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ width: 72, textAlign: 'right' }}>
                  {day.feeCollected == null ? '—' : formatCurrency(day.feeCollected)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Staff present
          </Typography>
          <Stack spacing={0.75}>
            {days.map((day) => (
              <Stack key={`att-${day.date}`} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ width: 72 }}>
                  {day.date.slice(5)}
                </Typography>
                <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 1, height: 8 }}>
                  <Box
                    sx={{
                      width: `${Math.round(((day.attendancePresent ?? 0) / maxAttendance) * 100)}%`,
                      bgcolor: 'success.main',
                      height: 8,
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ width: 36, textAlign: 'right' }}>
                  {day.attendancePresent ?? '—'}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}

function LimitedRoleHome({ permissions }: { permissions: string[] | undefined }) {
  const links: { label: string; href: string; icon: ElementType; description: string }[] = [];

  if (hasPermission(permissions, 'student.self.view')) {
    links.push({
      label: 'My profile',
      href: '/student/profile',
      icon: PersonOutlined,
      description: 'View your student details',
    });
  }
  if (hasPermission(permissions, 'student.self.fee.view')) {
    links.push({
      label: 'My fees',
      href: '/student/fees',
      icon: ReceiptLongOutlined,
      description: 'Dues, payments, and receipts',
    });
  }
  if (hasPermission(permissions, 'notice.view')) {
    links.push({
      label: 'Notices',
      href: '/notices',
      icon: AnnouncementOutlined,
      description: 'Announcements',
    });
  }
  if (hasPermission(permissions, 'visitor.create')) {
    links.push({
      label: 'Register visitor',
      href: '/visitors/new',
      icon: BadgeOutlined,
      description: 'Check in a visitor and print a badge',
    });
  }
  if (hasPermission(permissions, 'visitor.view') && !hasPermission(permissions, 'visitor.create')) {
    links.push({
      label: 'Visitors',
      href: '/visitors',
      icon: BadgeOutlined,
      description: 'People currently on campus',
    });
  }
  if (hasPermission(permissions, 'parent.portal.view')) {
    links.push({
      label: 'My children',
      href: '/parent',
      icon: PersonOutlined,
      description: 'Students linked to your account',
    });
  }
  if (hasPermission(permissions, 'event.view') && !hasPermission(permissions, 'student.self.view')) {
    links.push({
      label: 'Events',
      href: '/events',
      icon: CheckCircleOutlined,
      description: 'Calendar events',
    });
  }
  if (hasPermission(permissions, 'complaint.view')) {
    links.push({
      label: 'Complaints',
      href: '/complaints',
      icon: BuildOutlined,
      description: 'Maintenance requests you can open',
    });
  }
  if (hasPermission(permissions, 'fee.view')) {
    links.push({
      label: 'Fees',
      href: '/fees',
      icon: ReceiptLongOutlined,
      description: 'Structures, assignments, and payments',
    });
  }
  if (hasPermission(permissions, 'asset.view')) {
    links.push({
      label: 'Assets',
      href: '/assets',
      icon: BuildOutlined,
      description: 'Property and assignments',
    });
  }
  if (hasPermission(permissions, 'document.view')) {
    links.push({
      label: 'Documents',
      href: '/documents',
      icon: ReceiptLongOutlined,
      description: 'Certificates and passes already generated',
    });
  }
  if (hasPermission(permissions, 'approval.view')) {
    links.push({
      label: 'Approvals',
      href: '/approvals',
      icon: TaskAltOutlined,
      description: 'Requests waiting for a decision',
    });
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <HomeWelcomeHero
        title="Welcome back"
        subtitle="Your CampusOps portal"
        meta="Open a module below or use the sidebar navigation."
      />
      {links.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          {links.map((item) => (
            <Card key={item.href} variant="outlined">
              <CardActionArea component={Link} href={item.href}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <item.icon fontSize="small" />
                    </Box>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{item.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            This account does not include the operations dashboard. Open a module from the navigation menu to
            continue.
          </Typography>
        </Paper>
      )}
    </Stack>
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

      if (isPlatformOrganization(user?.organization?.code) || !isOperationalDashboardUser(user?.permissions)) {
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
  }, [isReady, isAuthenticated, user?.organization?.code, user?.permissions]);

  if (isReady && !isAuthenticated) {
    return <PublicLandingPage />;
  }

  if (!isReady || isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography sx={{ mb: 2 }}>Sign in to open your CampusOps workspace.</Typography>
          <Button component={Link} href="/login" variant="contained">
            Sign in
          </Button>
        </Paper>
      </Stack>
    );
  }

  if (isPlatformOrganization(user.organization?.code)) {
    return <PlatformHomeContent userEmail={user.email} permissions={user.permissions} />;
  }

  if (!isOperationalDashboardUser(user.permissions)) {
    return <LimitedRoleHome permissions={user.permissions} />;
  }

  if (errorMessage) {
    return (
      <Stack spacing={3}>
        <Alert severity="error">{errorMessage}</Alert>
        {hasPermission(user.permissions, 'staff.view') ? (
          <Button component={Link} href="/staff" variant="contained">
            Open staff
          </Button>
        ) : null}
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
    summaryCards.push({
      label: 'Students',
      value: String(metrics.students),
      href: '/students',
      icon: PeopleAltOutlined,
    });
  }
  if (metrics.activeStaff !== null) {
    summaryCards.push({
      label: 'Active staff',
      value: String(metrics.activeStaff),
      href: '/staff',
      icon: PeopleAltOutlined,
    });
  }
  if (isAttendanceEnabled() && metrics.todayAttendance !== null) {
    summaryCards.push({
      label: "Today's attendance",
      value: `${metrics.todayAttendance.present} present`,
      href: `/reports/attendance?date=${metrics.todayAttendance.date}`,
      icon: CheckCircleOutlined,
    });
  }
  if (metrics.outstandingFees !== null) {
    summaryCards.push({
      label: 'Outstanding fees',
      value: formatCurrency(metrics.outstandingFees.totalOutstanding),
      href: '/reports/fees',
      icon: ReceiptLongOutlined,
    });
  }
  if (metrics.classCount != null) {
    summaryCards.push({
      label: 'Classes',
      value: String(metrics.classCount),
      href: '/classes',
      icon: SchoolOutlined,
    });
  }
  if (metrics.feesCollectedThisMonth != null) {
    summaryCards.push({
      label: 'Collected this month',
      value: formatCurrency(metrics.feesCollectedThisMonth),
      href: '/reports/fees',
      icon: ReceiptLongOutlined,
    });
  }

  const priorityMetrics: DashboardMetricCardProps[] = [];
  if (metrics.pendingApprovals !== null) {
    priorityMetrics.push({
      label: 'Pending approvals',
      value: String(metrics.pendingApprovals),
      href: '/approvals',
      icon: TaskAltOutlined,
      detail: 'Requests waiting for action',
    });
  }
  if (metrics.openComplaints !== null) {
    priorityMetrics.push({
      label: 'Open complaints',
      value: String(metrics.openComplaints),
      href: '/reports/complaints?openOnly=true',
      icon: BuildOutlined,
      detail: 'Facilities and maintenance',
    });
  }
  if (metrics.complaintsReceivedToday != null) {
    priorityMetrics.push({
      label: 'Complaints today',
      value: String(metrics.complaintsReceivedToday),
      href: '/complaints',
      icon: BuildOutlined,
      detail: 'Received today',
    });
  }
  if (metrics.visitorsToday !== null) {
    priorityMetrics.push({
      label: 'Visitors today',
      value: String(metrics.visitorsToday.checkedInToday),
      href: `/reports/visitors?date=${summary.localDate}`,
      icon: BadgeOutlined,
      detail: `${metrics.visitorsToday.activeOnCampus} currently on campus`,
    });
  }
  if (metrics.assetAlerts !== null && metrics.assetAlerts.total > 0) {
    priorityMetrics.push({
      label: 'Asset warranty alerts',
      value: String(metrics.assetAlerts.total),
      href: '/assets?warrantyAlert=true',
      icon: BuildOutlined,
      detail: `${metrics.assetAlerts.expired} expired · ${metrics.assetAlerts.expiringSoon} expiring soon`,
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

  const quickActions = buildQuickActions(user.permissions);

  return (
    <Stack spacing={3}>
      <HomeWelcomeHero
        title={getGreetingLabel(summary.greetingPeriod)}
        subtitle={summary.organization.name}
        meta={formatDashboardDate(summary.localDate, summary.organization.timezone)}
      />
      <PlanLimitNotice />

      <DashboardQuickActions actions={quickActions} />

      {priorityMetrics.length > 0 ? (
        <Stack spacing={1.5}>
          <Typography variant="h6">Needs attention</Typography>
          <DashboardMetricGrid items={priorityMetrics} />
        </Stack>
      ) : null}

      {summaryCards.length > 0 ? (
        <Stack spacing={1.5}>
          <Typography variant="h6">Overview</Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            }}
          >
            {summaryCards.map((card, index) => (
              <StatTile key={card.label} {...card} tone={STAT_TONES[index % STAT_TONES.length]} hrefLabel="Open" />
            ))}
          </Box>
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No summary metrics are available for this account yet.
          </Typography>
        </Paper>
      )}

      {metrics.trends && metrics.trends.length > 0 ? <TrendBars days={metrics.trends} /> : null}

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
    </Stack>
  );
}

function PlanLimitNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void apiClient
      .get<{
        data: {
          planName: string;
          studentCount: number;
          studentLimit: number;
          staffCount: number;
          staffLimit: number;
          overStudentLimit: boolean;
          overStaffLimit: boolean;
        };
      }>('/organizations/current/subscription', { auth: true })
      .then((response) => {
        const plan = response.data;
        if (!plan.overStudentLimit && !plan.overStaffLimit) {
          setMessage(null);
          return;
        }
        const parts = [
          plan.overStudentLimit ? `${plan.studentCount} students (limit ${plan.studentLimit})` : null,
          plan.overStaffLimit ? `${plan.staffCount} staff (limit ${plan.staffLimit})` : null,
        ].filter(Boolean);
        setMessage(`${plan.planName} plan is above its recorded limit: ${parts.join(' and ')}. Existing records stay available.`);
      })
      .catch(() => undefined);
  }, []);

  if (!message) return null;
  return <Alert severity="warning">{message}</Alert>;
}
