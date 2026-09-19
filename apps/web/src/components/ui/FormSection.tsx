'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  maxWidth?: number | string;
}

export function FormSection({ children, title, maxWidth = 560 }: FormSectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth, width: '100%' }}>
      <Stack spacing={2}>
        {title ? (
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        ) : null}
        {children}
      </Stack>
    </Paper>
  );
}

interface FormActionsProps {
  children: React.ReactNode;
}

export function FormActions({ children }: FormActionsProps) {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
      {children}
    </Stack>
  );
}
