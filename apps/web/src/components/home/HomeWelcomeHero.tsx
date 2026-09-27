import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface HomeWelcomeHeroProps {
  title: string;
  subtitle: string;
  meta?: string;
}

export function HomeWelcomeHero({ title, subtitle, meta }: HomeWelcomeHeroProps) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        px: { xs: 2.5, sm: 3.5 },
        py: { xs: 3, sm: 4 },
        color: 'primary.contrastText',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 72%)`,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.92, fontWeight: 500 }}>
          {subtitle}
        </Typography>
        {meta ? (
          <Typography variant="body2" sx={{ opacity: 0.85, pt: 0.5 }}>
            {meta}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
