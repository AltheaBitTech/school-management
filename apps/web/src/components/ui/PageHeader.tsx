'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { brandVars } from '@/theme/theme';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      spacing={{ xs: 2, sm: 3 }}
    >
      <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0, alignItems: 'center' }}>
        {Icon ? (
          <Box
            aria-hidden
            sx={{
              width: { xs: 42, sm: 52 },
              height: { xs: 42, sm: 52 },
              flexShrink: 0,
              borderRadius: { xs: '12px', sm: '14px' },
              background: brandVars.gradientSoft,
              border: 1,
              borderColor: 'divider',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: brandVars.shadow,
            }}
          >
            <Icon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1" sx={{ wordBreak: 'break-word' }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {actions ? (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
          sx={{
            flexShrink: 0,
            '& > .MuiButton-root': { flex: { xs: '1 1 auto', sm: '0 0 auto' } },
          }}
        >
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}
