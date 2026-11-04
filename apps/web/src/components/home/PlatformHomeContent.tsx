import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { HomeWelcomeHero } from '@/components/home/HomeWelcomeHero';

const PLATFORM_FEATURES = [
  {
    title: 'School onboarding',
    description: 'Review registration requests, approve new schools, and share signup links with administrators.',
  },
  {
    title: 'Multi-tenant operations',
    description: 'Each school runs in its own organization with isolated staff, workflows, and records.',
  },
  {
    title: 'Operations, not academics',
    description: 'CampusOps focuses on day-to-day school operations—attendance, leave, fees, visitors, and more.',
  },
];

export function PlatformHomeContent({ userEmail }: { userEmail: string }) {
  return (
    <Stack spacing={3}>
      <HomeWelcomeHero
        title="Welcome to CampusOps"
        subtitle="Platform control center for school onboarding and tenant management."
        meta={`Signed in as ${userEmail}`}
      />

      <Grid container spacing={2}>
        {PLATFORM_FEATURES.map((feature) => (
          <Grid key={feature.title} size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
