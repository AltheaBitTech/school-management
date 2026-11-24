'use client';

import CancelOutlined from '@mui/icons-material/CancelOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import HourglassEmptyOutlined from '@mui/icons-material/HourglassEmptyOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';

type StatusTone = NonNullable<ChipProps['color']>;

const STATUS_TONES: Record<string, StatusTone> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  OPEN: 'error',
  ASSIGNED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CLOSED: 'default',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'default',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  DRAFT: 'warning',
  SCHEDULED: 'warning',
  CANCELLED: 'default',
  ARCHIVED: 'default',
  AVAILABLE: 'success',
  UNDER_MAINTENANCE: 'warning',
  RETIRED: 'default',
  CHECKED_IN: 'info',
  CHECKED_OUT: 'success',
  PUBLISHED: 'success',
  TRIAL: 'info',
  OFFBOARDING: 'warning',
  OFFBOARDED: 'default',
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'default',
  GENERATED: 'success',
  FAILED: 'error',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  ACTIVE: CheckCircleOutline,
  INACTIVE: CancelOutlined,
  OPEN: ErrorOutline,
  ASSIGNED: HourglassEmptyOutlined,
  IN_PROGRESS: HourglassEmptyOutlined,
  COMPLETED: CheckCircleOutline,
  CLOSED: CancelOutlined,
  PENDING: HourglassEmptyOutlined,
  PENDING_APPROVAL: HourglassEmptyOutlined,
  APPROVED: CheckCircleOutline,
  REJECTED: CancelOutlined,
  PARTIALLY_PAID: HourglassEmptyOutlined,
  PAID: CheckCircleOutline,
  DRAFT: HourglassEmptyOutlined,
  SCHEDULED: HourglassEmptyOutlined,
  CANCELLED: CancelOutlined,
  ARCHIVED: CancelOutlined,
  AVAILABLE: CheckCircleOutline,
  UNDER_MAINTENANCE: HourglassEmptyOutlined,
  RETIRED: CancelOutlined,
  CHECKED_IN: InfoOutlined,
  CHECKED_OUT: CheckCircleOutline,
  PUBLISHED: CheckCircleOutline,
  TRIAL: HourglassEmptyOutlined,
  OFFBOARDING: HourglassEmptyOutlined,
  OFFBOARDED: CancelOutlined,
  CRITICAL: ErrorOutline,
  HIGH: ErrorOutline,
  MEDIUM: InfoOutlined,
  LOW: InfoOutlined,
  GENERATED: CheckCircleOutline,
  FAILED: ErrorOutline,
};

interface StatusChipProps {
  status: string;
  label?: string;
}

export function getStatusTone(status: string): StatusTone {
  return STATUS_TONES[status] ?? 'default';
}

export function StatusChip({ status, label }: StatusChipProps) {
  const Icon = STATUS_ICONS[status] ?? InfoOutlined;
  const tone = getStatusTone(status);

  return (
    <Chip
      size="small"
      label={label ?? status}
      color={tone}
      icon={<Icon sx={{ fontSize: '16px !important', color: 'inherit !important' }} />}
      sx={(theme) => {
        const vars = theme.vars ?? theme;
        if (tone === 'default') {
          return {
            bgcolor: vars.palette.action.hover,
            color: vars.palette.text.secondary,
            border: '1px solid',
            borderColor: vars.palette.divider,
          };
        }
        const channel = theme.vars ? theme.vars.palette[tone].mainChannel : null;
        const tint = (opacity: number) =>
          channel ? `rgba(${channel} / ${opacity})` : alpha(theme.palette[tone].main, opacity);
        return {
          bgcolor: tint(0.12),
          color: vars.palette[tone].dark,
          border: '1px solid',
          borderColor: tint(0.26),
          ...theme.applyStyles('dark', { color: vars.palette[tone].main }),
        };
      }}
    />
  );
}
