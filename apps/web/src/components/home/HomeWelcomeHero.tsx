import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { brandVars } from '@/theme/theme';

interface HomeWelcomeHeroProps {
  title: string;
  subtitle: string;
  meta?: string;
}

export function HomeWelcomeHero({ title, subtitle, meta }: HomeWelcomeHeroProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        px: { xs: 2.5, sm: 4 },
        py: { xs: 3, sm: 4 },
        color: 'common.white',
        background: brandVars.gradient,
        boxShadow: '0 20px 40px -20px rgba(79, 70, 229, 0.55)',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          borderRadius: '50%',
          pointerEvents: 'none',
        },
        '&::before': {
          width: 320,
          height: 320,
          top: -160,
          right: -80,
          background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)',
        },
        '&::after': {
          width: 240,
          height: 240,
          bottom: -140,
          right: 160,
          background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)',
        },
      }}
    >
      <Stack spacing={0.75} sx={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
        <Typography variant="h4" component="h1" sx={{ color: 'inherit' }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.88)' }}>{subtitle}</Typography>
        {meta ? (
          <Typography
            variant="caption"
            sx={{
              alignSelf: 'flex-start',
              mt: 1,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.24)',
              color: 'common.white',
              fontWeight: 600,
            }}
          >
            {meta}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
