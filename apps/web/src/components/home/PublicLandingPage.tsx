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
import { brandVars } from '@/theme/theme';

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

const FEATURE_TONES = ['primary', 'secondary', 'success', 'warning'] as const;

export function PublicLandingPage() {
  return (
    <Box component="main">
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'brand.navy',
          backgroundImage: [
            'radial-gradient(60% 60% at 85% 10%, rgba(124, 58, 237, 0.45) 0%, transparent 60%)',
            'radial-gradient(50% 50% at 10% 90%, rgba(37, 99, 235, 0.45) 0%, transparent 60%)',
            'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
          ].join(', '),
          color: 'common.white',
          py: { xs: 7, md: 12 },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                <Chip
                  label="Operations platform for schools, colleges & institutes"
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                    color: 'common.white',
                    fontWeight: 600,
                    height: 'auto',
                    py: 0.5,
                    '& .MuiChip-label': { whiteSpace: 'normal' },
                  }}
                />
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{ fontSize: { xs: '2.1rem', sm: '2.75rem', md: '3.25rem' }, lineHeight: 1.08 }}
                >
                  One platform to manage{' '}
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(90deg, #93c5fd 0%, #c4b5fd 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    every campus operation
                  </Box>
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 400, opacity: 0.85, maxWidth: 640, fontSize: { xs: '1rem', sm: '1.15rem' } }}
                >
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
                      bgcolor: 'common.white',
                      backgroundImage: 'none',
                      color: 'grey.900',
                      boxShadow: '0 10px 30px -10px rgba(255,255,255,0.4)',
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
                      color: 'common.white',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      backgroundImage: 'none',
                      borderColor: 'rgba(255,255,255,0.4)',
                      backdropFilter: 'blur(8px)',
                      '&:hover': {
                        color: 'common.white',
                        backgroundColor: 'rgba(255,255,255,0.14)',
                        borderColor: 'common.white',
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
        <Typography variant="overline" color="primary" sx={{ display: 'block', mb: 1 }}>
          Modules
        </Typography>
        <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
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
                      borderRadius: '12px',
                      bgcolor: `rgba(var(--mui-palette-${FEATURE_TONES[index % FEATURE_TONES.length]}-mainChannel) / 0.12)`,
                      color: `${FEATURE_TONES[index % FEATURE_TONES.length]}.main`,
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
                      borderRadius: '12px',
                      background: brandVars.gradient,
                      color: 'common.white',
                      boxShadow: '0 8px 20px -8px rgba(79, 70, 229, 0.6)',
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
