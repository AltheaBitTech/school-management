import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AppThemeProvider } from '@/components/providers/AppThemeProvider';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'CampusOps',
  description: 'School Operations Management SaaS',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
