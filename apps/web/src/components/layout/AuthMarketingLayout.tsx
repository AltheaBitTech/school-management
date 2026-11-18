'use client';

import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ThemeProvider, alpha } from '@mui/material/styles';
import Link from 'next/link';
import { authGlassTheme } from '@/theme/auth-glass-theme';

interface AuthMarketingLayoutProps {
  children: React.ReactNode;
  maxWidth?: number;
  centered?: boolean;
}

export function AuthMarketingLayout({ children, maxWidth = 440 }: AuthMarketingLayoutProps) {
  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'secondary.main',
        backgroundImage: `radial-gradient(circle at 15% 10%, ${alpha(theme.palette.primary.main, 0.35)} 0%, transparent 45%), radial-gradient(circle at 90% 90%, ${alpha(theme.palette.primary.light, 0.12)} 0%, transparent 40%)`,
      })}
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
              width: 36,
              height: 36,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              color: 'common.white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SchoolOutlined fontSize="small" />
          </Box>
          <Typography variant="h6" sx={{ color: 'common.white', fontWeight: 700, letterSpacing: '-0.02em' }}>
            CampusOps
          </Typography>
        </Stack>
        <ThemeProvider theme={authGlassTheme}>
          <Paper
            sx={{
              p: { xs: 2.5, sm: 4 },
              borderRadius: 4,
              boxShadow: '0 24px 60px -12px rgba(2, 6, 23, 0.55)',
              '& a:not(.MuiButton-root)': { color: 'primary.main', fontWeight: 600 },
            }}
          >
            {children}
          </Paper>
        </ThemeProvider>
        <Typography
          variant="caption"
          component="p"
          sx={{ mt: 3, textAlign: 'center', color: 'sidebar.textMuted' }}
        >
          One platform for schools, colleges & institutes
        </Typography>
      </Box>
    </Box>
  );
}
