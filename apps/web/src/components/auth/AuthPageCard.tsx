'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { AuthMarketingLayout } from '@/components/layout/AuthMarketingLayout';

interface AuthPageCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footerLink?: {
    href: string;
    label: string;
  };
}

export function AuthPageCard({ title, description, children, footerLink }: AuthPageCardProps) {
  return (
    <AuthMarketingLayout maxWidth={440} centered>
      <Stack spacing={3}>
        <Stack spacing={0.75} sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {description ? (
            <Typography color="text.secondary" variant="body2">
              {description}
            </Typography>
          ) : null}
        </Stack>

        {children}

        {footerLink ? (
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            <Link href={footerLink.href} style={{ color: 'inherit' }}>
              {footerLink.label}
            </Link>
          </Typography>
        ) : null}
      </Stack>
    </AuthMarketingLayout>
  );
}
