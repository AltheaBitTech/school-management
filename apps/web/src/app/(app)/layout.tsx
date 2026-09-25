import { AppShell } from '@/components/layout/AppShell';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthSessionProvider>
      <OnboardingGate>
        <AppShell>{children}</AppShell>
      </OnboardingGate>
    </AuthSessionProvider>
  );
}
