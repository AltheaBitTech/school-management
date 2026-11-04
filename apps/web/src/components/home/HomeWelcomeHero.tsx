import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface HomeWelcomeHeroProps {
  title: string;
  subtitle: string;
  meta?: string;
}

export function HomeWelcomeHero({ title, subtitle, meta }: HomeWelcomeHeroProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      <Typography color="text.secondary">{subtitle}</Typography>
      {meta ? (
        <Typography variant="body2" color="text.secondary">
          {meta}
        </Typography>
      ) : null}
    </Stack>
  );
}
