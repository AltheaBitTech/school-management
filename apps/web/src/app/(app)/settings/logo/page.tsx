'use client';

import ImageOutlined from '@mui/icons-material/ImageOutlined';
import Alert from '@mui/material/Alert';
import { useState } from 'react';
import { FileAttachmentUploadField } from '@/components/files/FileAttachmentUploadField';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError, apiClient } from '@/lib/api/client';

export default function OrganizationLogoPage() {
  const { showSuccess } = useAppSnackbar();
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveLogo(): Promise<void> {
    const fileId = fileIds[0];
    if (!fileId) {
      setErrorMessage('Upload a logo image first');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await apiClient.patch('/organizations/current/logo', { fileId }, { auth: true });
      showSuccess('School logo saved. New PDFs will use it.');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to save logo');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormPageShell
      title="School logo"
      description="Certificates, ID cards, and visitor PDFs use this image in the header."
      icon={ImageOutlined}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveLogo();
        }}
      >
        <FormSection title="Logo file" description="PNG or JPEG, one image.">
          <FileAttachmentUploadField
            label="Logo"
            helperText="Shown on the left of official documents."
            accept="image/png,image/jpeg"
            maxFiles={1}
            fileIds={fileIds}
            onChange={setFileIds}
          />
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <FormPageFooter
            cancelHref="/"
            submitLabel="Save logo"
            submittingLabel="Saving…"
            isSubmitting={isSaving}
            submitDisabled={fileIds.length === 0}
          />
        </FormSection>
      </form>
    </FormPageShell>
  );
}
