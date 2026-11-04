'use client';

import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';
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
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(165deg, #070d18 0%, #0f2044 55%, #1a2744 100%)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: '50%',
          top: '-40px',
          right: '12%',
          bgcolor: 'rgba(232, 195, 106, 0.16)',
          filter: 'blur(70px)',
        }}
      />
      <Box sx={{ width: '100%', maxWidth, position: 'relative', zIndex: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="center" sx={{ mb: 3 }}>
          <SchoolOutlined sx={{ color: '#e8c36a' }} />
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{ color: 'common.white', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.02em' }}
          >
            CampusOps
          </Typography>
        </Stack>
        <Box
          sx={{
            bgcolor: '#121c33',
            border: '1px solid rgba(232, 195, 106, 0.35)',
            borderLeft: '4px solid #e8c36a',
            borderRadius: '20px',
            p: { xs: 2.5, sm: 4 },
            boxShadow: '0 24px 50px rgba(0, 0, 0, 0.4)',
          }}
        >
          <ThemeProvider theme={authGlassTheme}>
            <Box
              sx={{
                color: '#f8f4ea',
                '& .MuiTypography-root': { color: '#e4d7c3' },
                '& .MuiTypography-h4, & .MuiTypography-h5, & .MuiTypography-h6': { color: '#ffffff' },
                '& .MuiTypography-overline': { color: '#c4b89a' },
                '& a, & .MuiLink-root': { color: '#e8c36a' },
                '& .MuiFormHelperText-root': { color: '#c4b89a !important' },
                '& .MuiInputLabel-root, & .MuiFormLabel-root': { color: '#e4d7c3 !important' },
                '& .MuiInputLabel-root.Mui-focused, & .MuiFormLabel-root.Mui-focused': {
                  color: '#e8c36a !important',
                },
                '& .MuiSvgIcon-root': { color: '#e8c36a !important' },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(8, 14, 28, 0.45)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(232, 195, 106, 0.32)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(232, 195, 106, 0.7)' },
                  '&.Mui-focused': { boxShadow: '0 0 0 3.5px rgba(201, 162, 74, 0.28)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#e8c36a', borderWidth: 1 },
                },
                '& .MuiOutlinedInput-input': {
                  color: '#ffffff !important',
                  WebkitTextFillColor: '#ffffff !important',
                },
                '& .MuiButton-contained': { color: '#0f2044 !important' },
                '& .MuiButton-contained .MuiSvgIcon-root': { color: '#0f2044 !important' },
              }}
            >
              {children}
            </Box>
          </ThemeProvider>
        </Box>
      </Box>
    </Box>
  );
}
