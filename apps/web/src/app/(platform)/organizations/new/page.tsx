'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { login } from '@/lib/auth/auth-client';
import { bootstrapOrganization } from '@/lib/organizations/organizations-client';

export default function CreateOrganizationPage() {
  const [platformOrganizationCode, setPlatformOrganizationCode] = useState('campusops-platform');
  const [platformEmail, setPlatformEmail] = useState('');
  const [platformPassword, setPlatformPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        organizationCode: platformOrganizationCode,
        email: platformEmail,
        password: platformPassword,
      });

      const result = await bootstrapOrganization({
        name: schoolName,
        code: schoolCode,
        admin: {
          email: adminEmail,
          password: adminPassword,
        },
      });

      setSuccessMessage(
        `Created ${result.organization.name} (${result.organization.code}). School admin: ${result.admin.email}`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Organization bootstrap failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box component="main" sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" component="h1">
              Create school organization
            </Typography>
            <Typography color="text.secondary">
              Platform administrators authenticate first, then bootstrap a school tenant and its
              initial SCHOOL_ADMIN user.
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Typography variant="h6">Platform administrator</Typography>
              <TextField
                label="Platform organization code"
                value={platformOrganizationCode}
                onChange={(event) => setPlatformOrganizationCode(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Platform admin email"
                type="email"
                value={platformEmail}
                onChange={(event) => setPlatformEmail(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Platform admin password"
                type="password"
                value={platformPassword}
                onChange={(event) => setPlatformPassword(event.target.value)}
                required
                fullWidth
              />

              <Typography variant="h6">School tenant</Typography>
              <TextField
                label="School name"
                value={schoolName}
                onChange={(event) => setSchoolName(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="School organization code"
                value={schoolCode}
                onChange={(event) => setSchoolCode(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Initial admin email"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Initial admin password"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                required
                fullWidth
              />

              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
              {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Creating organization…' : 'Create organization'}
              </Button>
              <Button component={Link} href="/login" variant="text">
                Go to school admin login
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
