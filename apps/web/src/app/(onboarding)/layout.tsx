import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';

export default function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthSessionProvider>
      <OnboardingGate>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
          <Container maxWidth="md">
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
              CampusOps Setup
            </Typography>
            {children}
          </Container>
        </Box>
      </OnboardingGate>
    </AuthSessionProvider>
  );
}
