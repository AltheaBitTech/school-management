'use client';

import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export function PublicBrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: compact ? 2 : 4 }}>
      <SchoolOutlined color="primary" />
      <Typography
        variant="h6"
        fontWeight={700}
        component={Link}
        href="/"
        sx={{ textDecoration: 'none', color: 'text.primary' }}
      >
        CampusOps
      </Typography>
    </Stack>
  );
}
