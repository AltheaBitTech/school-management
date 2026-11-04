'use client';

import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FileAttachmentUploadField } from '@/components/files/FileAttachmentUploadField';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import {
  formatNoticeStatus,
  getNotice,
  isEditableNoticeStatus,
  publishNotice,
  updateNotice,
  type Notice,
  type NoticeAudienceInput,
} from '@/lib/notices/notices-client';

function buildAudiences(
  entireSchool: boolean,
  allStaff: boolean,
  allStudents: boolean,
  allParents: boolean,
  departmentIds: string[],
): NoticeAudienceInput[] {
  const audiences: NoticeAudienceInput[] = [];

  if (entireSchool) {
    audiences.push({ audienceType: 'ENTIRE_SCHOOL' });
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

export default function EditNoticePage() {
  const params = useParams<{ id: string }>();
  const noticeId = params.id;
  const { showSuccess } = useAppSnackbar();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entireSchool, setEntireSchool] = useState(false);
  const [allStaff, setAllStaff] = useState(false);
  const [allStudents, setAllStudents] = useState(false);
  const [allParents, setAllParents] = useState(false);
  const [attachmentFileIds, setAttachmentFileIds] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audiences = useMemo(
    () => buildAudiences(entireSchool, allStaff, allStudents, allParents, selectedDepartments),
    [entireSchool, allStaff, allStudents, allParents, selectedDepartments],
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const [noticeData, departmentResponse] = await Promise.all([
          getNotice(noticeId),
          listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
        ]);

        if (cancelled) {
          return;
        }

        setNotice(noticeData);
        setTitle(noticeData.title);
        setContent(noticeData.content);
        setEntireSchool(
          noticeData.audiences.some((audience) => audience.audienceType === 'ENTIRE_SCHOOL'),
        );
        setAllStaff(noticeData.audiences.some((audience) => audience.audienceType === 'STAFF'));
        setAllStudents(noticeData.audiences.some((audience) => audience.audienceType === 'STUDENT'));
        setAllParents(noticeData.audiences.some((audience) => audience.audienceType === 'PARENT'));
        setAttachmentFileIds(noticeData.attachments?.map((item) => item.fileId) ?? []);
        setSelectedDepartments(
          noticeData.audiences
            .filter((audience) => audience.audienceType === 'DEPARTMENT' && audience.departmentId)
            .map((audience) => audience.departmentId as string),
        );
        setScheduleAt(
          noticeData.scheduledAt
            ? new Date(noticeData.scheduledAt).toISOString().slice(0, 16)
            : '',
        );
        setDepartments(departmentResponse.data);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load notice');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [noticeId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!notice || !isEditableNoticeStatus(notice.status)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (audiences.length === 0) {
        throw new Error('Select at least one audience.');
      }

      const updated = await updateNotice(noticeId, {
        title,
        content,
        audiences,
        attachmentFileIds,
        scheduledAt: scheduleAt ? new Date(scheduleAt).toISOString() : null,
      });
      setNotice(updated);
      showSuccess('Notice updated');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update notice');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const published = await publishNotice(noticeId);
      setNotice(published);
      showSuccess('Notice published');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to publish notice');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <FormPageShell title="Edit notice" description="Loading the notice." icon={AnnouncementOutlined} maxWidth={840}>
        <Skeleton variant="rounded" height={320} />
      </FormPageShell>
    );
  }

  if (!notice) {
    return <Alert severity="error">{errorMessage ?? 'Notice not found.'}</Alert>;
  }

  if (!isEditableNoticeStatus(notice.status)) {
    return (
      <FormPageShell
        title="Edit notice"
        description="This notice can no longer be edited."
        icon={AnnouncementOutlined}
        maxWidth={840}
      >
        <Alert severity="warning">Published or archived notices stay as they were sent.</Alert>
        <Button component={Link} href={`/notices/${notice.id}`} variant="outlined">
          Back to notice
        </Button>
      </FormPageShell>
    );
  }

  const canSave = title.trim().length > 0 && content.trim().length > 0 && audiences.length > 0;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Edit notice"
        description={`${formatNoticeStatus(notice.status)} notice. Saving keeps the current status.`}
        icon={AnnouncementOutlined}
        maxWidth={840}
        actions={
          <Button component={Link} href={`/notices/${notice.id}`} variant="outlined">
            View detail
          </Button>
        }
        footer={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="flex-end"
            flexWrap="wrap"
            useFlexGap
          >
            <Button component={Link} href="/notices" variant="text" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting || !canSave}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="contained"
              color="success"
              disabled={isSubmitting || !canSave}
              onClick={() => void handlePublish()}
            >
              Publish now
            </Button>
          </Stack>
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {audiences.length === 0 ? (
          <Alert severity="warning">Select at least one audience before saving.</Alert>
        ) : null}

        <FormSection title="Notice" description="What people will read." maxWidth="100%">
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            fullWidth
          />
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
              label="Entire school"
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
              label="Attachments"
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

        <FormSection
          title="Schedule"
          description="Clear the date to return the notice to a draft schedule."
          maxWidth="100%"
        >
          <TextField
            label="Schedule for"
            type="datetime-local"
            value={scheduleAt}
            onChange={(event) => setScheduleAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Leave empty to keep the notice unscheduled."
            fullWidth
          />
        </FormSection>
      </FormPageShell>
    </Box>
  );
}
