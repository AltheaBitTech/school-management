'use client';

import Box from '@mui/material/Box';
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
          sx={{ p: 2 }}
        >
          {footer}
        </Paper>
      ) : null}
    </Stack>
  );
}
