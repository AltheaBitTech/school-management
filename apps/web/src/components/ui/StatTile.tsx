'use client';

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

const TONE_TINT: Record<StatTone, string> = {
  primary: 'primary.light',
  secondary: 'action.hover',
  success: 'success.light',
  warning: 'warning.light',
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
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2.5,
          bgcolor: TONE_TINT[tone],
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
        sx={{ fontWeight: 750, lineHeight: 1.1, mb: 0.5, fontVariantNumeric: 'tabular-nums' }}
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
        <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1.5, fontWeight: 700 }}>
          {hrefLabel}
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
