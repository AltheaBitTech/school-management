'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      spacing={2}
    >
      <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
        {Icon ? <Icon sx={{ color: 'primary.main', mt: 0.6, fontSize: 28 }} /> : null}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              '&::after': {
                content: '""',
                display: 'block',
                width: 40,
                height: 3,
                mt: 1,
                borderRadius: 1,
                bgcolor: '#e8c36a',
              },
            }}
          >
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
          justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          sx={{ flexShrink: 0 }}
        >
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}
