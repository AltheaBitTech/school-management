'use client';

import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';

type StatusTone = NonNullable<ChipProps['color']>;

const STATUS_TONES: Record<string, StatusTone> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  OPEN: 'default',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'info',
  CLOSED: 'success',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  DRAFT: 'default',
  SCHEDULED: 'info',
  CANCELLED: 'default',
  ARCHIVED: 'default',
  AVAILABLE: 'success',
  UNDER_MAINTENANCE: 'warning',
  RETIRED: 'default',
  CHECKED_IN: 'success',
  CHECKED_OUT: 'default',
  PUBLISHED: 'success',
  OFFBOARDING: 'warning',
  OFFBOARDED: 'default',
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'default',
  GENERATED: 'success',
  FAILED: 'error',
};

interface StatusChipProps {
  status: string;
  label?: string;
}

export function getStatusTone(status: string): StatusTone {
  return STATUS_TONES[status] ?? 'default';
}

export function StatusChip({ status, label }: StatusChipProps) {
  return <Chip size="small" label={label ?? status} color={getStatusTone(status)} />;
}
