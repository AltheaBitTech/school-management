'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { FormActions, FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { createStudent } from '@/lib/students/students-client';

export default function NewStudentPage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsForbidden(false);
    setIsSubmitting(true);

    try {
      await createStudent({
        studentCode: studentCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        className: className.trim() || undefined,
      });
      setSuccessMessage('Student created successfully.');
      router.push('/students');
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create student');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <PageHeader
        title="Create student"
        description="Add a minimal student record for your organization."
      />

      <FormSection>
        <TextField
          label="Student code"
          value={studentCode}
          onChange={(event) => setStudentCode(event.target.value)}
          required
          inputProps={{ maxLength: 32 }}
          helperText="Use lowercase letters, numbers, or hyphens"
        />
        <TextField
          label="First name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          required
          inputProps={{ maxLength: 100 }}
        />
        <TextField
          label="Last name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          required
          inputProps={{ maxLength: 100 }}
        />
        <TextField
          label="Class"
          value={className}
          onChange={(event) => setClassName(event.target.value)}
          inputProps={{ maxLength: 100 }}
          helperText="Optional, for example Grade 8-A"
        />

        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <FormActions>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create student'}
          </Button>
          <Button component={Link} href="/students">
            Cancel
          </Button>
        </FormActions>
      </FormSection>
    </Stack>
  );
}
