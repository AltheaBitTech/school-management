'use client';

import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import DefaultPropsProvider from '@mui/material/DefaultPropsProvider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import Link from 'next/link';
import { useMemo } from 'react';
import { ColorModeToggle } from '@/components/layout/ColorModeToggle';
import { brandVars } from '@/theme/theme';

interface AuthMarketingLayoutProps {
  children: React.ReactNode;
  maxWidth?: number;
  centered?: boolean;
}

export function AuthMarketingLayout({ children, maxWidth = 440 }: AuthMarketingLayoutProps) {
  const theme = useTheme();
  // Single-column auth forms use medium inputs for comfortable touch targets.
  // DefaultPropsProvider reads the same `{ defaultProps }` shape as theme.components at runtime.
  const authDefaults = useMemo(
    () =>
      ({
      ...theme.components,
      MuiTextField: {
        ...theme.components?.MuiTextField,
        defaultProps: { ...theme.components?.MuiTextField?.defaultProps, variant: 'filled' as const, size: 'medium' as const },
      },
      }) as unknown as React.ComponentProps<typeof DefaultPropsProvider>['value'],
    [theme.components],
  );

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 1.5, sm: 2 },
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'brand.navy',
        backgroundImage: [
          'radial-gradient(55% 55% at 12% 8%, rgba(37, 99, 235, 0.5) 0%, transparent 60%)',
          'radial-gradient(45% 45% at 92% 92%, rgba(124, 58, 237, 0.42) 0%, transparent 60%)',
        ].join(', '),
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2, '& .MuiIconButton-root': { color: 'rgba(255,255,255,0.8)' } }}>
        <ColorModeToggle />
      </Box>
      <Box sx={{ width: '100%', maxWidth, position: 'relative', zIndex: 1 }}>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          justifyContent="center"
          sx={{ mb: 3, textDecoration: 'none' }}
          component={Link}
          href="/"
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: brandVars.gradient,
              boxShadow: '0 8px 24px -8px rgba(124, 58, 237, 0.8)',
              color: 'common.white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SchoolOutlined fontSize="small" />
          </Box>
          <Typography variant="h6" sx={{ color: 'common.white', fontWeight: 750, letterSpacing: '-0.03em' }}>
            CampusOps
          </Typography>
        </Stack>
        <DefaultPropsProvider value={authDefaults}>
          <Paper
            sx={{
              p: { xs: 2.5, sm: 4 },
              borderRadius: '20px',
              border: 1,
              borderColor: 'divider',
              boxShadow: '0 24px 60px -12px rgba(2, 6, 23, 0.55)',
              '& a:not(.MuiButton-root)': { color: 'primary.main', fontWeight: 600 },
            }}
          >
            {children}
          </Paper>
        </DefaultPropsProvider>
        <Typography
          variant="caption"
          component="p"
          sx={{ mt: 3, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}
        >
          One platform for schools, colleges & institutes
        </Typography>
      </Box>
    </Box>
  );
}
