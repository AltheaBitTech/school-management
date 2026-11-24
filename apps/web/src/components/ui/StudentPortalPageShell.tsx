'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface StudentPortalPageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** Lighter layout for student self-service — same tokens, minimal chrome. */
export function StudentPortalPageShell({ title, description, children }: StudentPortalPageShellProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>
          {title}
        </Typography>
        {description ? (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Stack>
  );
}

interface StudentPortalSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function StudentPortalSection({ title, children }: StudentPortalSectionProps) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: '16px',
        border: 1,
        borderColor: 'divider',
        boxShadow: 'var(--mui-palette-brand-shadow)',
        px: { xs: 2, sm: 2.5 },
        py: { xs: 2, sm: 2.5 },
      }}
    >
      {title ? (
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          {title}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}
