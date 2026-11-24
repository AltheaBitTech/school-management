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
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(190px, 1fr))' },
        }}
      >
        {actions.map(({ label, href, icon: Icon }) => (
          <Button
            key={href}
            component={Link}
            href={href}
            variant="outlined"
            sx={{
              justifyContent: 'flex-start',
              gap: 1.25,
              py: 1.25,
              px: 1.5,
              borderRadius: '12px',
              textAlign: 'left',
              lineHeight: 1.3,
              '&:hover .quick-action-icon': { background: 'var(--mui-palette-brand-gradient)', color: 'common.white' },
            }}
          >
            <Box
              className="quick-action-icon"
              aria-hidden
              sx={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: '8px',
                bgcolor: 'primary.light',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms ease, color 150ms ease',
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Box>
            <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {label}
            </Box>
          </Button>
        ))}
      </Box>
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
      <Skeleton variant="rounded" height={128} sx={{ borderRadius: '24px' }} />
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, sm: 2 },
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={156} sx={{ borderRadius: '16px' }} />
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
        <Grid key={item.label} size={{ xs: 6, md: 4 }}>
          <DashboardMetricCard {...item} />
        </Grid>
      ))}
    </Grid>
  );
}
