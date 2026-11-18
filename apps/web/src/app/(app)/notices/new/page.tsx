'use client';

import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FileAttachmentUploadField } from '@/components/files/FileAttachmentUploadField';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import {
  createNotice,
  publishNotice,
  updateNotice,
  type NoticeAudienceInput,
} from '@/lib/notices/notices-client';
import { validateRequired } from '@/lib/forms/validators';

function buildAudiences(
  entireSchool: boolean,
  allStaff: boolean,
  allStudents: boolean,
  allParents: boolean,
  departmentIds: string[],
): NoticeAudienceInput[] {
  const audiences: NoticeAudienceInput[] = [];

  if (entireSchool) {
    audiences.push({ audienceType: 'ENTIRE_ORGANIZATION' });
  }
  if (allStaff) {
    audiences.push({ audienceType: 'STAFF' });
  }
  if (allStudents) {
    audiences.push({ audienceType: 'STUDENT' });
  }
  if (allParents) {
    audiences.push({ audienceType: 'PARENT' });
  }
  for (const departmentId of departmentIds) {
    audiences.push({ audienceType: 'DEPARTMENT', departmentId });
  }

  return audiences;
}

export default function NewNoticePage() {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entireSchool, setEntireSchool] = useState(true);
  const [allStaff, setAllStaff] = useState(false);
  const [allStudents, setAllStudents] = useState(false);
  const [allParents, setAllParents] = useState(false);
  const [attachmentFileIds, setAttachmentFileIds] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audiences = useMemo(
    () => buildAudiences(entireSchool, allStaff, allStudents, allParents, selectedDepartments),
    [entireSchool, allStaff, allStudents, allParents, selectedDepartments],
  );

  useEffect(() => {
    void listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((response) => setDepartments(response.data))
      .catch(() => undefined);
  }, []);

  async function handleAction(action: 'draft' | 'schedule' | 'publish'): Promise<void> {
    setErrorMessage(null);
    const titleProblem = validateRequired(title, 'Title');
    const contentProblem = validateRequired(content, 'Content');
    if (titleProblem || contentProblem) {
      setErrorMessage(titleProblem ?? contentProblem ?? null);
      return;
    }
    if (audiences.length === 0) {
      setErrorMessage('Select at least one audience.');
      return;
    }
    setIsSubmitting(true);

    try {
      const notice = await createNotice({
        title: title.trim(),
        content: content.trim(),
        audiences,
        attachmentFileIds: attachmentFileIds.length ? attachmentFileIds : undefined,
      });

      if (action === 'schedule') {
        if (!scheduleAt) {
          throw new Error('Choose a schedule date and time.');
        }
        await updateNotice(notice.id, { scheduledAt: new Date(scheduleAt).toISOString() });
        showSuccess('Notice scheduled');
        router.push(`/notices/${notice.id}`);
        return;
      }

      if (action === 'publish') {
        await publishNotice(notice.id);
        showSuccess('Notice published');
      } else {
        showSuccess('Draft saved');
      }

      router.push(`/notices/${notice.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create notice');
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await handleAction('draft');
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  const canSave = title.trim().length > 0 && content.trim().length > 0 && audiences.length > 0;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="New notice"
        description="Create a draft, schedule it for later, or publish immediately."
        icon={AnnouncementOutlined}
        maxWidth={840}
        footer={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button component={Link} href="/notices" variant="text" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="outlined" disabled={isSubmitting || !canSave}>
              {isSubmitting ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} color="inherit" aria-hidden />
                  Saving…
                </Box>
              ) : (
                'Save draft'
              )}
            </Button>
            <Button
              type="button"
              variant="contained"
              disabled={isSubmitting || !canSave || !scheduleAt}
              onClick={() => void handleAction('schedule')}
            >
              {isSubmitting ? 'Scheduling…' : 'Schedule'}
            </Button>
            <Button
              type="button"
              variant="contained"
              color="success"
              disabled={isSubmitting || !canSave}
              onClick={() => void handleAction('publish')}
            >
              {isSubmitting ? 'Publishing…' : 'Publish now'}
            </Button>
          </Stack>
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {audiences.length === 0 ? (
          <Alert severity="warning">Select at least one audience before saving.</Alert>
        ) : null}

        <FormSection title="Notice" description="What people will read." maxWidth="100%">
        <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required fullWidth />
        <TextField
          label="Content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          multiline
          minRows={6}
          required
          fullWidth
        />
        </FormSection>

        <FormSection title="Audience" description="Who should receive this notice." maxWidth="100%">
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={entireSchool}
                  onChange={(event) => setEntireSchool(event.target.checked)}
                />
              }
              label="Everyone (entire institution)"
            />
            <FormControlLabel
              control={
                <Checkbox checked={allStaff} onChange={(event) => setAllStaff(event.target.checked)} />
              }
              label="All staff"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={allStudents}
                  onChange={(event) => setAllStudents(event.target.checked)}
                />
              }
              label="All students"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={allParents}
                  onChange={(event) => setAllParents(event.target.checked)}
                />
              }
              label="Parents (student portal)"
            />
          </FormGroup>
          <Box sx={{ mt: 2 }}>
            <FileAttachmentUploadField
              label="Attachments (optional)"
              helperText="Images or PDF, up to 10 files."
              accept="image/png,image/jpeg,application/pdf"
              maxFiles={10}
              fileIds={attachmentFileIds}
              onChange={setAttachmentFileIds}
            />
          </Box>
          <TextField
            select
            SelectProps={{ multiple: true }}
            label="Departments"
            value={selectedDepartments}
            onChange={(event) =>
              setSelectedDepartments(
                typeof event.target.value === 'string'
                  ? event.target.value.split(',')
                  : event.target.value,
              )
            }
            helperText="Optional. People in these departments are included as well."
            fullWidth
          >
            {departments.map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>
        </FormSection>

        <FormSection title="Schedule" description="Leave this empty to save a draft or publish now." maxWidth="100%">
        <TextField
          label="Schedule for"
          type="datetime-local"
          value={scheduleAt}
          onChange={(event) => setScheduleAt(event.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="Required only when you choose Schedule."
          fullWidth
        />
        </FormSection>
      </FormPageShell>
    </Box>
  );
}
