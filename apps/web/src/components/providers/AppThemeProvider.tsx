'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppSnackbarProvider } from '@/components/providers/AppSnackbarProvider';
import { theme } from '@/theme/theme';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppSnackbarProvider>{children}</AppSnackbarProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
