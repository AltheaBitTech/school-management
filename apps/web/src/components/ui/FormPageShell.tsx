'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { PageHeader } from '@/components/ui/PageHeader';

interface FormPageShellProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number | string;
}

export function FormPageShell({
  title,
  description,
  icon,
  actions,
  children,
  footer,
  maxWidth = 720,
}: FormPageShellProps) {
  return (
    <Stack spacing={3} sx={{ maxWidth, width: '100%' }}>
      <PageHeader title={title} description={description} icon={icon} actions={actions} />
      <Stack spacing={2.5}>{children}</Stack>
      {footer ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            position: 'sticky',
            bottom: { xs: 0, sm: 16 },
            zIndex: 2,
            mx: { xs: -2, sm: 0 },
            borderRadius: { xs: 0, sm: '16px' },
            borderLeft: { xs: 0, sm: 1 },
            borderRight: { xs: 0, sm: 1 },
            borderBottom: { xs: 0, sm: 1 },
            borderColor: 'divider',
            bgcolor: 'brand.glass',
            backdropFilter: 'saturate(180%) blur(14px)',
            boxShadow: 'var(--mui-palette-brand-shadowHover)',
            pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 2 },
          }}
        >
          {footer}
        </Paper>
      ) : null}
    </Stack>
  );
}
