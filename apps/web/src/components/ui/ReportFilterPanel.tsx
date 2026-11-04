'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface ReportFilterPanelProps {
  children: ReactNode;
  title?: string;
}

export function ReportFilterPanel({ children, title = 'Filters' }: ReportFilterPanelProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            {children}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
