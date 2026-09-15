'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import {
  formatAudienceLabel,
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
  departmentIds: string[],
): NoticeAudienceInput[] {
  const audiences: NoticeAudienceInput[] = [];

  if (entireSchool) {
    audiences.push({ audienceType: 'ENTIRE_SCHOOL' });
  }
  if (allStaff) {
    audiences.push({ audienceType: 'STAFF' });
  }
  for (const departmentId of departmentIds) {
    audiences.push({ audienceType: 'DEPARTMENT', departmentId });
  }

  return audiences;
}

export default function EditNoticePage() {
  const params = useParams<{ id: string }>();
  const noticeId = params.id;

  const [notice, setNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entireSchool, setEntireSchool] = useState(false);
  const [allStaff, setAllStaff] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audiences = useMemo(
    () => buildAudiences(entireSchool, allStaff, selectedDepartments),
    [entireSchool, allStaff, selectedDepartments],
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
    setSuccessMessage(null);

    try {
      if (audiences.length === 0) {
        throw new Error('Select at least one audience.');
      }

      const updated = await updateNotice(noticeId, {
        title,
        content,
        audiences,
        scheduledAt: scheduleAt ? new Date(scheduleAt).toISOString() : null,
      });
      setNotice(updated);
      setSuccessMessage('Notice updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update notice');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const published = await publishNotice(noticeId);
      setNotice(published);
      setSuccessMessage('Notice published.');
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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading notice" />
      </Box>
    );
  }

  if (!notice) {
    return <Alert severity="error">{errorMessage ?? 'Notice not found.'}</Alert>;
  }

  if (!isEditableNoticeStatus(notice.status)) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">This notice can no longer be edited.</Alert>
        <Button component={Link} href={`/notices/${notice.id}`}>
          Back to notice
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Edit notice
          </Typography>
          <Chip label={formatNoticeStatus(notice.status)} size="small" sx={{ mt: 1 }} />
        </Box>
        <Button component={Link} href={`/notices/${notice.id}`}>
          View detail
        </Button>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <TextField
            label="Content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            multiline
            minRows={6}
            required
          />

          <Divider />

          <Typography variant="subtitle1">Audience</Typography>
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
          </FormGroup>
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
            fullWidth
          >
            {departments.map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Schedule for"
            type="datetime-local"
            value={scheduleAt}
            onChange={(event) => setScheduleAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Clear the schedule to return the notice to draft."
          />

          <Typography variant="body2" color="text.secondary">
            Current audience: {notice.audiences.map(formatAudienceLabel).join(', ')}
          </Typography>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Save changes
            </Button>
            <Button type="button" variant="outlined" disabled={isSubmitting} onClick={() => void handlePublish()}>
              Publish now
            </Button>
            <Button component={Link} href="/notices">
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
