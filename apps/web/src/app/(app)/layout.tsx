import { AppShell } from '@/components/layout/AppShell';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthSessionProvider>
      <AppShell>{children}</AppShell>
    </AuthSessionProvider>
  );
}
