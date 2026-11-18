'use client';

import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import DomainAddOutlined from '@mui/icons-material/DomainAddOutlined';
import HourglassBottomOutlined from '@mui/icons-material/HourglassBottomOutlined';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { HomeWelcomeHero } from '@/components/home/HomeWelcomeHero';
import { StatTile } from '@/components/ui/StatTile';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { hasPermission } from '@/lib/auth/routing';
import { getPlatformAnalytics, type PlatformAnalytics } from '@/lib/platform/platform-client';

const ANALYTICS_PERMISSION = 'platform.organization.view';

const numberFormat = new Intl.NumberFormat('en-IN');
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function formatCount(value: number | undefined): string {
  return numberFormat.format(value ?? 0);
}

function formatPlanLabel(code: string): string {
  return code
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface PlatformHomeContentProps {
  userEmail: string;
  permissions?: string[];
}

export function PlatformHomeContent({ userEmail, permissions }: PlatformHomeContentProps) {
  const canViewAnalytics = hasPermission(permissions, ANALYTICS_PERMISSION);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(canViewAnalytics);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const load = useCallback(() => {
    if (!canViewAnalytics) return;
    setIsLoading(true);
    setErrorMessage(null);
    void getPlatformAnalytics()
      .then(setAnalytics)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage('Could not load platform metrics. Please try again.');
        }
      })
      .finally(() => setIsLoading(false));
  }, [canViewAnalytics]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack spacing={3}>
      <HomeWelcomeHero
        title="Welcome to CampusOps"
        subtitle="Platform control center for school onboarding and tenant management."
        meta={`Signed in as ${userEmail}`}
      />

      {canViewAnalytics ? (
        <PlatformMetrics
          analytics={analytics}
          isLoading={isLoading}
          errorMessage={errorMessage}
          isForbidden={isForbidden}
          onRetry={load}
        />
      ) : null}

      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Pending school registrations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Approve or reject new schools, then send each administrator their organization code and signup link.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={Link} href="/organizations/new" variant="contained" size="large">
              Create school
            </Button>
            <Button component={Link} href="/admin/registrations" variant="outlined" size="large">
              Open registration requests
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

interface PlatformMetricsProps {
  analytics: PlatformAnalytics | null;
  isLoading: boolean;
  errorMessage: string | null;
  isForbidden: boolean;
  onRetry: () => void;
}

function PlatformMetrics({ analytics, isLoading, errorMessage, isForbidden, onRetry }: PlatformMetricsProps) {
  if (isForbidden) {
    return <ForbiddenState message="You do not have permission to view platform metrics." />;
  }

  if (errorMessage) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        {errorMessage}
      </Alert>
    );
  }

  if (isLoading || !analytics) {
    return (
      <Grid container spacing={2} aria-busy="true" aria-label="Loading platform metrics">
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Skeleton variant="rounded" height={150} />
          </Grid>
        ))}
      </Grid>
    );
  }

  const byStatus = analytics.organizationsByStatus;
  const totalSchools = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatTile
            label="Active schools"
            value={formatCount(byStatus.ACTIVE)}
            detail={`${formatCount(totalSchools)} total`}
            icon={ApartmentOutlined}
            href="/admin/subscriptions"
            hrefLabel="View subscriptions"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatTile
            label="Pending registrations"
            value={formatCount(analytics.pendingRegistrations)}
            icon={HowToRegOutlined}
            tone="warning"
            href="/admin/registrations"
            hrefLabel="Review"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatTile
            label="New schools"
            value={formatCount(analytics.newOrganizationsLast30Days)}
            detail="Last 30 days"
            icon={DomainAddOutlined}
            tone="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatTile
            label="Trials ending"
            value={formatCount(analytics.trialsEndingSoon)}
            detail="Next 14 days"
            icon={HourglassBottomOutlined}
            tone="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatTile
            label="Students"
            value={formatCount(analytics.totalStudents)}
            detail="Across all schools"
            icon={SchoolOutlined}
            tone="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatTile
            label="Staff"
            value={formatCount(analytics.totalStaff)}
            detail="Across all schools"
            icon={BadgeOutlined}
            tone="secondary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <SchoolsByPlanCard analytics={analytics} />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <RecentSchoolsCard analytics={analytics} />
        </Grid>
      </Grid>
    </Stack>
  );
}

function SchoolsByPlanCard({ analytics }: { analytics: PlatformAnalytics }) {
  const plans = Object.entries(analytics.subscriptionsByPlan).sort(([, a], [, b]) => b - a);
  const totalSubscriptions = plans.reduce((sum, [, count]) => sum + count, 0);
  const suspended = analytics.organizationsByStatus.SUSPENDED ?? 0;
  const archived = analytics.organizationsByStatus.ARCHIVED ?? 0;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
          Schools by plan
        </Typography>
        {plans.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No subscriptions yet.
          </Typography>
        ) : (
          <Stack spacing={1.75}>
            {plans.map(([code, count]) => (
              <Box key={code}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatPlanLabel(code)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCount(count)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={totalSubscriptions ? (count / totalSubscriptions) * 100 : 0}
                  aria-label={`${formatPlanLabel(code)} share`}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            ))}
          </Stack>
        )}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Suspended
            </Typography>
            <Typography variant="h6" component="p">
              {formatCount(suspended)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Archived
            </Typography>
            <Typography variant="h6" component="p">
              {formatCount(archived)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function RecentSchoolsCard({ analytics }: { analytics: PlatformAnalytics }) {
  const schools = analytics.recentOrganizations;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
          Recently joined schools
        </Typography>
        {schools.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No schools have joined yet. Approved registrations will appear here.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.5}>
            {schools.map((school) => (
              <Stack
                key={school.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.75, sm: 2 }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {school.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {school.code} · Joined {dateFormat.format(new Date(school.createdAt))}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {school.planName ? (
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      {school.planName}
                    </Typography>
                  ) : null}
                  <StatusChip status={school.status} />
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
