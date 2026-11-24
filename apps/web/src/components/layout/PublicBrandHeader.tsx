'use client';

import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { brandVars } from '@/theme/theme';

export function PublicBrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: compact ? 2 : 4 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '9px',
          background: brandVars.gradient,
          color: 'common.white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SchoolOutlined sx={{ fontSize: 18 }} />
      </Box>
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
