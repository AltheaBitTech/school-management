'use client';

import ArticleOutlined from '@mui/icons-material/ArticleOutlined';import { resetSubmitting } from '@/lib/forms/submit-state';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError, apiClient } from '@/lib/api/client';

const PLACEHOLDERS = [
  'student.name',
  'student.admissionNumber',
  'student.class',
  'organization.name',
  'organization.code',
  'generated.date',
  'staff.name',
  'staff.employeeCode',
  'staff.designation',
  'staff.department',
];

export default function EditDocumentTemplatePage() {
  const params = useParams<{ documentType: string }>();
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [name, setName] = useState('Certificate');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [notEditable, setNotEditable] = useState(false);

  useEffect(() => {
    void apiClient
      .get<{ data: Array<{ documentType: string; name: string; title: string; body: string; editable: boolean }> }>(
        '/documents/templates',
        { auth: true },
      )
      .then((response) => {
        const row = response.data.find((item) => item.documentType === params.documentType);
        if (!row) {
          setErrorMessage('This template was not found.');
          return;
        }
        if (!row.editable) {
          setNotEditable(true);
          return;
        }
        setName(row.name);
        setTitle(row.title);
        setBody(row.body);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Could not load the template');
      })
      .finally(() => setIsLoading(false));
  }, [params.documentType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Title is required.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.patch(
        `/documents/templates/${params.documentType}`,
        { title: title.trim(), body },
        { auth: true },
      );
      showSuccess('Certificate wording saved. The next PDF will use it.');
      router.push('/documents/templates');
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      setErrorMessage(error instanceof ApiError ? error.message : 'Could not save the template');
    }
  }

  if (isForbidden) return <ForbiddenState />;
  if (notEditable) {
    return <Alert severity="info">This document uses the ID card layout, not a text template.</Alert>;
  }

  if (isLoading) {
    return (
      <FormPageShell title="Edit certificate" icon={ArticleOutlined}>
        <Skeleton variant="rounded" height={280} />
      </FormPageShell>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <FormPageShell
        title={name}
        description="The next generated PDF uses this title and body. Leave the body empty to keep the standard letter."
        icon={ArticleOutlined}
        maxWidth={840}
        footer={
          <FormPageFooter
            cancelHref="/documents/templates"
            submitLabel="Save wording"
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
            submitDisabled={!title.trim()}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <FormSection title="Wording" description="Use placeholders exactly as listed. Unknown ones are rejected." maxWidth="100%">
          <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required fullWidth />
          <TextField
            label="Body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            multiline
            minRows={8}
            fullWidth
            helperText="Optional. When filled in, this replaces the standard paragraphs."
          />
          <Typography variant="body2" color="text.secondary">
            Placeholders: {PLACEHOLDERS.map((item) => `{{${item}}}`).join('  ')}
          </Typography>
        </FormSection>
      </FormPageShell>
    </Box>
  );
}
