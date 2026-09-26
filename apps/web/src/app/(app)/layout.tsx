import { AppShell } from '@/components/layout/AppShell';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import { StaffSelfRouteGate } from '@/components/routing/StaffSelfRouteGate';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthSessionProvider>
      <OnboardingGate>
        <StaffSelfRouteGate>
          <AppShell>{children}</AppShell>
        </StaffSelfRouteGate>
      </OnboardingGate>
    </AuthSessionProvider>
  );
}
