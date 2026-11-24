'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const SIDEBAR_ITEMS = ['Home', 'Staff', 'Visitors', 'Fees'] as const;

export function LandingProductMock() {
  return (
    <Box
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 40px 80px -20px rgba(2, 6, 23, 0.6), 0 0 0 8px rgba(255,255,255,0.04)',
        transform: { md: 'perspective(1600px) rotateY(-6deg) rotateX(2deg)' },
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: 'action.hover',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          app.campusops.io — campus dashboard
        </Typography>
      </Stack>

      <Box sx={{ display: 'flex', minHeight: 280 }}>
        <Box
          sx={{
            width: 88,
            flexShrink: 0,
            bgcolor: 'sidebar.main',
            borderRight: 1,
            borderColor: 'divider',
            py: 2,
            px: 1.25,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Stack spacing={1}>
            {SIDEBAR_ITEMS.map((item, index) => (
              <Box
                key={item}
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: index === 0 ? 'sidebar.activeText' : 'sidebar.textMuted',
                  bgcolor: index === 0 ? 'sidebar.active' : 'transparent',
                }}
              >
                {item}
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
            Today at a glance
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            }}
          >
            {[
              { label: 'Visitors on campus', value: '12' },
              { label: 'Pending approvals', value: '5' },
              { label: 'Open complaints', value: '3' },
              { label: 'Staff present', value: '48' },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
