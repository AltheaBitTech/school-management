'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { PageHeader } from '@/components/ui/PageHeader';

interface ListPageShellProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function ListPageShell({
  title,
  description,
  icon,
  actions,
  filters,
  footer,
  children,
}: ListPageShellProps) {
  return (
    <Stack spacing={3}>
      <PageHeader title={title} description={description} icon={icon} actions={actions} />

      {filters ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {filters}
        </Paper>
      ) : null}

      {children}

      {footer}
    </Stack>
  );
}
