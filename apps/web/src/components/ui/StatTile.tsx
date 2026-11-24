'use client';

import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { ElementType } from 'react';

export type StatTone = 'primary' | 'secondary' | 'success' | 'warning';

const TONE_COLOR: Record<StatTone, string> = {
  primary: 'primary.main',
  secondary: 'secondary.main',
  success: 'success.main',
  warning: 'warning.main',
};

const TONE_CHANNEL: Record<StatTone, string> = {
  primary: 'var(--mui-palette-primary-mainChannel)',
  secondary: 'var(--mui-palette-secondary-mainChannel)',
  success: 'var(--mui-palette-success-mainChannel)',
  warning: 'var(--mui-palette-warning-mainChannel)',
};

export interface StatTileProps {
  label: string;
  value: string;
  icon: ElementType;
  href?: string;
  detail?: string;
  tone?: StatTone;
  hrefLabel?: string;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  detail,
  tone = 'primary',
  hrefLabel = 'View',
}: StatTileProps) {
  const body = (
    <CardContent
      sx={{
        p: { xs: 2, sm: 2.5 },
        '&:last-child': { pb: { xs: 2, sm: 2.5 } },
        position: 'relative',
        height: '100%',
        backgroundImage: `radial-gradient(120% 80% at 100% 0%, rgba(${TONE_CHANNEL[tone]} / 0.10) 0%, transparent 60%)`,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: `rgba(${TONE_CHANNEL[tone]} / 0.12)`,
          border: '1px solid',
          borderColor: `rgba(${TONE_CHANNEL[tone]} / 0.2)`,
          color: TONE_COLOR[tone],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Typography
        variant="h4"
        component="p"
        sx={{ fontWeight: 800, lineHeight: 1.1, mb: 0.5, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      {detail ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {detail}
        </Typography>
      ) : null}
      {href ? (
        <Typography
          variant="caption"
          color="primary.main"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1.5, fontWeight: 700 }}
        >
          {hrefLabel}
          <ArrowForwardOutlined sx={{ fontSize: 14 }} />
        </Typography>
      ) : null}
    </CardContent>
  );

  return (
    <Card variant="outlined" sx={{ height: '100%', bgcolor: 'background.paper' }}>
      {href ? (
        <CardActionArea component={Link} href={href} sx={{ height: '100%', alignItems: 'stretch' }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}
