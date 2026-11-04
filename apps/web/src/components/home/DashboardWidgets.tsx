'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { ElementType } from 'react';
import { StatTile, type StatTone } from '@/components/ui/StatTile';

export interface QuickActionItem {
  label: string;
  href: string;
  icon: ElementType;
}

interface DashboardQuickActionsProps {
  title?: string;
  actions: QuickActionItem[];
}

export function DashboardQuickActions({ title = 'Quick actions', actions }: DashboardQuickActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">{title}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {actions.map(({ label, href, icon: Icon }) => (
          <Button
            key={href}
            component={Link}
            href={href}
            variant="outlined"
            startIcon={<Icon fontSize="small" />}
          >
            {label}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

export interface DashboardMetricCardProps {
  label: string;
  value: string;
  href: string;
  icon: ElementType;
  detail?: string;
}

export function DashboardMetricCard({ label, value, href, icon, detail }: DashboardMetricCardProps) {
  return (
    <StatTile
      label={label}
      value={value}
      href={href}
      icon={icon}
      detail={detail}
      tone="warning"
      hrefLabel="Review"
    />
  );
}

export function DashboardSkeleton() {
  return (
    <Stack spacing={3} aria-label="Loading dashboard">
      <Skeleton variant="rounded" height={72} />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={156} />
        ))}
      </Box>
    </Stack>
  );
}

export const STAT_TONES: StatTone[] = ['primary', 'secondary', 'success', 'warning'];

interface DashboardMetricGridProps {
  items: DashboardMetricCardProps[];
}

export function DashboardMetricGrid({ items }: DashboardMetricGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid key={item.label} size={{ xs: 12, sm: 6, md: 4 }}>
          <DashboardMetricCard {...item} />
        </Grid>
      ))}
    </Grid>
  );
}
