import { AppShell } from '@/components/layout/AppShell';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import { SessionIdleProvider } from '@/components/providers/SessionIdleProvider';
import { SessionRefreshProvider } from '@/components/providers/SessionRefreshProvider';
import { StaffSelfRouteGate } from '@/components/routing/StaffSelfRouteGate';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthSessionProvider>
      <SessionIdleProvider>
        <SessionRefreshProvider>
        <OnboardingGate>
          <StaffSelfRouteGate>
            <AppShell>{children}</AppShell>
          </StaffSelfRouteGate>
        </OnboardingGate>
        </SessionRefreshProvider>
      </SessionIdleProvider>
    </AuthSessionProvider>
  );
}
