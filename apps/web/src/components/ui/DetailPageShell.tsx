'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PageHeader } from '@/components/ui/PageHeader';

interface DetailPageShellProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}

interface DetailFactRowProps {
  label: string;
  children: React.ReactNode;
}

export function DetailFactRow({ label, children }: DetailFactRowProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.25, sm: 1.5 }}
      useFlexGap
      sx={{ py: 1, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
    >
      <Typography
        component="span"
        variant="body2"
        color="text.secondary"
        sx={{
          minWidth: { sm: 140 },
          fontWeight: 500,
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{children}</Box>
    </Stack>
  );
}

export function DetailPageShell({
  title,
  description,
  icon,
  actions,
  meta,
  children,
}: DetailPageShellProps) {
  return (
    <Stack spacing={3}>
      <PageHeader title={title} description={description} icon={icon} actions={actions} />

      {meta ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: meta ? 8 : 12 }}>
            <Stack spacing={3}>{children}</Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, position: { md: 'sticky' }, top: { md: 88 } }}>
              {meta}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Box>{children}</Box>
      )}
    </Stack>
  );
}
