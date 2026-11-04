'use client';

import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError, apiClient } from '@/lib/api/client';

interface IdCardSettings {
  showPhoto: boolean;
  showCode: boolean;
  footerLine: string;
}

export default function DocumentSettingsPage() {
  const { showSuccess } = useAppSnackbar();
  const [settings, setSettings] = useState<IdCardSettings | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void apiClient
      .get<{ data: IdCardSettings }>('/organizations/current/document-settings', { auth: true })
      .then((response) => setSettings(response.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Could not load ID card settings');
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!settings) return;
    if (settings.footerLine.length > 80) {
      setErrorMessage('Footer must be 80 characters or fewer.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.patch<{ data: IdCardSettings }>(
        '/organizations/current/document-settings',
        settings,
        { auth: true },
      );
      setSettings(response.data);
      showSuccess('ID card layout saved. New cards will use it.');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Could not save the layout');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) return <ForbiddenState />;

  return (
    <form onSubmit={handleSubmit}>
      <FormPageShell
        title="ID card layout"
        description="These options apply to the next student and staff ID cards. Existing cards stay as they were printed."
        icon={BadgeOutlined}
        footer={
          <FormPageFooter
            cancelHref="/documents"
            submitLabel="Save layout"
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
            submitDisabled={!settings}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {!settings ? <Skeleton variant="rounded" height={220} /> : (
          <FormSection title="Card" description="Photo appears when the person already has a portrait on file." maxWidth="100%">
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showPhoto}
                  onChange={(event) => setSettings({ ...settings, showPhoto: event.target.checked })}
                />
              }
              label="Show photo"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showCode}
                  onChange={(event) => setSettings({ ...settings, showCode: event.target.checked })}
                />
              }
              label="Show admission or employee code"
            />
            <TextField
              label="Footer line"
              value={settings.footerLine}
              onChange={(event) => setSettings({ ...settings, footerLine: event.target.value })}
              helperText="Optional. Leave blank to keep the issued date. 80 characters maximum."
              fullWidth
              inputProps={{ maxLength: 80 }}
            />
          </FormSection>
        )}
      </FormPageShell>
    </form>
  );
}
