'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import Link from 'next/link';
import { useMemo } from 'react';
import { EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import {
  getVisibleReports,
  groupVisibleReports,
} from '@/lib/reports/reports-catalog';

function ReportIcon(): React.ReactNode {
  return (
    <SvgIcon color="primary" fontSize="large">
      <path
        d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm7-4H7v-2h12v2zm0-4H7V7h12v2z"
      />
    </SvgIcon>
  );
}

export default function ReportsHubPage() {
  const { user, isReady } = useAuthSession();

  const sections = useMemo(() => {
    if (!isReady) {
      return [];
    }
    return groupVisibleReports(getVisibleReports(user?.permissions));
  }, [isReady, user?.permissions]);

  const hasReports = sections.length > 0;

  return (
    <ListPageShell
      title="Reports"
      description="Operational reports for your school. Open a report to filter by date, department, status, and other criteria supported by that module."
      icon={BarChartOutlined}
    >
      {!isReady ? <LoadingState label="Loading available reports" columnCount={3} /> : null}

      {isReady && !hasReports ? (
        <EmptyState
          icon={BarChartOutlined}
          message="No reports are available for your account. Contact your school administrator if you need access."
        />
      ) : null}

      {isReady && hasReports
        ? sections.map((section) => (
        <Box key={section.group}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
            {section.label}
          </Typography>
          <Box
            sx={{
              mt: 1.5,
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
            }}
          >
            {section.reports.map((report) => (
              <Card key={report.id} variant="outlined" sx={{ height: '100%', display: 'flex' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <ReportIcon />
                    <Box>
                      <Typography variant="h6" component="h2" sx={{ fontSize: '1.05rem' }}>
                        {report.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {report.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Button component={Link} href={report.href} variant="contained" size="small">
                    Open report
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      ))
        : null}
    </ListPageShell>
  );
}
