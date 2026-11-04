'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { uploadFile } from '@/lib/files/files-client';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ImageAttachmentPreviewList } from '@/components/ui/ImageAttachmentPreviewList';
import { ApiError } from '@/lib/api/client';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  createComplaint,
  formatComplaintCategory,
  formatComplaintPriority,
  type ComplaintCategory,
  type ComplaintPriority,
} from '@/lib/complaints/complaints-client';

interface PendingAttachment {
  id: string;
  label: string;
  previewUrl: string;
}

export default function NewComplaintPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('IT');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [location, setLocation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const attachmentFileIds = useMemo(() => attachments.map((item) => item.id), [attachments]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  function removeAttachment(id: string): void {
    setAttachments((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const complaint = await createComplaint({
        title,
        description,
        category,
        priority,
        location: location || undefined,
        attachmentFileIds: attachmentFileIds.length ? attachmentFileIds : undefined,
      });
      router.push(`/complaints/${complaint.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create complaint');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="New complaint"
        description="Report a maintenance issue for assignment and tracking."
        icon={BuildOutlined}
        footer={
          <FormPageFooter
            cancelHref="/complaints"
            submitLabel="Submit complaint"
            submittingLabel="Submitting…"
            isSubmitting={isSubmitting}
          />
        }
      >
        <FormSection title="Details" maxWidth="100%">
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={4}
            required
            fullWidth
          />
          <TextField
            select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ComplaintCategory)}
            required
            fullWidth
          >
            {COMPLAINT_CATEGORIES.map((item) => (
              <MenuItem key={item} value={item}>
                {formatComplaintCategory(item)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as ComplaintPriority)}
            required
            fullWidth
          >
            {COMPLAINT_PRIORITIES.map((item) => (
              <MenuItem key={item} value={item}>
                {formatComplaintPriority(item)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            fullWidth
          />
        </FormSection>

        <FormSection title="Photos" maxWidth="100%">
          <Typography variant="body2" color="text.secondary">
            Optional — up to 5 images (PNG or JPEG).
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={attachments.length >= 5}
            >
              Add photo
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg"
                onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  setUploadError(null);
                  try {
                    const uploaded = await uploadFile(file);
                    const previewUrl = URL.createObjectURL(file);
                    setAttachments((current) => [
                      ...current,
                      { id: uploaded.id, label: uploaded.originalName, previewUrl },
                    ]);
                  } catch (error) {
      resetSubmitting(setIsSubmitting);
                    setUploadError(error instanceof Error ? error.message : 'Upload failed');
                  }
                }}
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              {attachments.length}/5 attached
            </Typography>
          </Stack>
          <ImageAttachmentPreviewList
            items={attachments}
            onRemove={removeAttachment}
          />
          {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}
        </FormSection>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </FormPageShell>
    </Box>
  );
}
