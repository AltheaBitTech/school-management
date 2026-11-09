'use client';

import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import { resetSubmitting } from '@/lib/forms/submit-state';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError, apiClient } from '@/lib/api/client';
import { validateRequiredMinMaxLength } from '@/lib/forms/validators';

export default function NewTransportRoutePage() {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nameProblem = validateRequiredMinMaxLength(name, 'Name', 2, 80);
    const codeProblem = validateRequiredMinMaxLength(code, 'Code', 2, 32);
    if (nameProblem || codeProblem) {
      setErrorMessage(nameProblem ?? codeProblem ?? null);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.post<{ data: { id: string } }>(
        '/transport/routes',
        { name: name.trim(), code: code.trim().toLowerCase() },
        { auth: true },
      );
      showSuccess('Route created. Add stops next.');
      router.push(`/transport/routes/${response.data.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      setErrorMessage(error instanceof ApiError ? error.message : 'Could not create the route');
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <FormPageShell
        title="New route"
        description="A short code keeps rosters easy to scan. You can add stops on the next screen."
        icon={DirectionsBusOutlined}
        footer={
          <FormPageFooter
            cancelHref="/transport"
            submitLabel="Create route"
            submittingLabel="Creating…"
            isSubmitting={isSubmitting}
            submitDisabled={name.trim().length < 2 || code.trim().length < 2}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <FormSection title="Route" maxWidth="100%">
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} required fullWidth helperText="For example, North route" />
          <TextField
            label="Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            fullWidth
            helperText="Lowercase letters or numbers, unique in this school"
          />
        </FormSection>
      </FormPageShell>
    </Box>
  );
}
