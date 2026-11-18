'use client';

import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import InventoryOutlined from '@mui/icons-material/InventoryOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { LandingProductMock } from '@/components/home/LandingProductMock';
import { PublicSiteFooter } from '@/components/layout/PublicSiteFooter';

const FEATURE_MODULES = [
  {
    name: 'Complaints & Maintenance',
    description: 'Track and resolve facility issues end to end',
    Icon: BuildOutlined,
  },
  {
    name: 'Leave Management',
    description: 'Digital leave requests with approval workflows',
    Icon: EventAvailableOutlined,
  },
  {
    name: 'Visitor Management',
    description: 'Replace paper registers with digital check-in',
    Icon: BadgeOutlined,
  },
  {
    name: 'Notices & Circulars',
    description: 'Publish and track communications',
    Icon: AnnouncementOutlined,
  },
  {
    name: 'Asset Management',
    description: 'Track every asset from purchase to retirement',
    Icon: InventoryOutlined,
  },
  {
    name: 'Document Generator',
    description: 'Generate certificates and letters in one click',
    Icon: DescriptionOutlined,
  },
  {
    name: 'Approval Workflows',
    description: 'Multi-level digital approvals for every request',
    Icon: TaskAltOutlined,
  },
  {
    name: 'Event Calendar',
    description: 'Schedule events with venues and participants',
    Icon: CalendarMonthOutlined,
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: 'Register',
    description: 'Submit your institution details for platform review.',
  },
  {
    step: 'Onboard',
    description: 'Complete admin signup and configure your organization.',
  },
  {
    step: 'Operate',
    description: 'Run daily workflows from one secure workspace.',
  },
] as const;

const BOARD_TYPES = ['CBSE', 'ICSE', 'State Board', 'Colleges & Universities', 'Coaching Institutes'] as const;

const FEATURE_TONES = ['primary.main', 'secondary.main', 'success.main', 'warning.main'] as const;

export function PublicLandingPage() {
  return (
    <Box component="main">
      <Box
        sx={{
          background: 'linear-gradient(128deg, #0f2044 0%, #1a2a4a 68%, #6e5420 100%)',
          color: '#ffffff',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                <Chip
                  label="Operations platform for schools, colleges & institutes"
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    fontWeight: 600,
                  }}
                />
                <Typography variant="h3" component="h1">
                  One platform to manage every campus operation
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.92, maxWidth: 640 }}>
                  CampusOps digitizes complaints, leave, visitors, assets, notices, and every campus workflow —
                  replacing paper registers, Excel sheets, and WhatsApp approvals.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                  <Button
                    component={Link}
                    href="/register-organization"
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    Register Your Institution
                  </Button>
                  <Button
                    component={Link}
                    href="/login"
                    variant="outlined"
                    size="large"
                    sx={{
                      color: '#ffffff !important',
                      backgroundColor: 'transparent !important',
                      backgroundImage: 'none !important',
                      borderColor: 'rgba(255,255,255,0.85) !important',
                      '&:hover': {
                        color: '#ffffff !important',
                        backgroundColor: 'rgba(255,255,255,0.12) !important',
                        borderColor: '#ffffff !important',
                      },
                    }}
                  >
                    Sign In
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <LandingProductMock />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography variant="h4" component="h2" sx={{ mb: 3 }}>
          Everything your institution runs on
        </Typography>
        <Grid container spacing={2}>
          {FEATURE_MODULES.map(({ name, description, Icon }, index) => (
            <Grid key={name} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined" sx={{ height: '100%', bgcolor: 'background.paper' }}>
                <CardContent>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: FEATURE_TONES[index % FEATURE_TONES.length],
                      color: 'common.white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="subtitle1" sx={{ mb: 0.75 }}>
                    {name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', py: { xs: 5, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
            How it works
          </Typography>
          <Grid container spacing={3}>
            {HOW_IT_WORKS.map((item, index) => (
              <Grid key={item.step} size={{ xs: 12, md: 4 }}>
                <Stack spacing={1.25}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'common.white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="h6">{item.step}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Built for every board
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>
          CBSE · ICSE · State · International
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {BOARD_TYPES.map((board) => (
            <Chip key={board} label={board} variant="outlined" sx={{ fontWeight: 600 }} />
          ))}
        </Stack>
      </Container>

      <PublicSiteFooter />
    </Box>
  );
}
