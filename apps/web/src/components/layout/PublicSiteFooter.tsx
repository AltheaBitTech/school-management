'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export function PublicSiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        py: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center" useFlexGap>
          <Typography component={Link} href="/register-organization" variant="body2" color="text.secondary">
            Register your institution
          </Typography>
          <Typography component={Link} href="/login" variant="body2" color="text.secondary">
            Sign in
          </Typography>
          <Typography component="span" variant="body2" color="text.disabled">
            Privacy (coming soon)
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          CampusOps © 2026 · One platform for schools, colleges & institutes
        </Typography>
      </Stack>
    </Box>
  );
}
