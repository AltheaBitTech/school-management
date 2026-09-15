'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import {
  createNotice,
  publishNotice,
  updateNotice,
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

export default function NewNoticePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entireSchool, setEntireSchool] = useState(true);
  const [allStaff, setAllStaff] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audiences = useMemo(
    () => buildAudiences(entireSchool, allStaff, selectedDepartments),
    [entireSchool, allStaff, selectedDepartments],
  );

  useEffect(() => {
    void listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((response) => setDepartments(response.data))
      .catch(() => undefined);
  }, []);

  async function handleAction(action: 'draft' | 'schedule' | 'publish'): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (audiences.length === 0) {
        throw new Error('Select at least one audience.');
      }

      const notice = await createNotice({ title, content, audiences });

      if (action === 'schedule') {
        if (!scheduleAt) {
          throw new Error('Choose a schedule date and time.');
        }
        await updateNotice(notice.id, { scheduledAt: new Date(scheduleAt).toISOString() });
        router.push(`/notices/${notice.id}`);
        return;
      }

      if (action === 'publish') {
        await publishNotice(notice.id);
      }

      router.push(`/notices/${notice.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create notice');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await handleAction('draft');
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Box>
        <Typography variant="h4" component="h1">
          New notice
        </Typography>
        <Typography color="text.secondary">
          Create a draft, schedule it for later, or publish immediately.
        </Typography>
      </Box>

      <Stack spacing={2} maxWidth="md">
        <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <TextField
          label="Content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          multiline
          minRows={6}
          required
        />

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Audience
          </Typography>
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
            helperText="Department audiences use union semantics."
            fullWidth
            sx={{ mt: 2 }}
          >
            {departments.map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <TextField
          label="Schedule for"
          type="datetime-local"
          value={scheduleAt}
          onChange={(event) => setScheduleAt(event.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="Optional. Used when scheduling instead of publishing now."
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button type="submit" variant="outlined" disabled={isSubmitting}>
            Save draft
          </Button>
          <Button
            type="button"
            variant="contained"
            disabled={isSubmitting}
            onClick={() => void handleAction('schedule')}
          >
            Schedule
          </Button>
          <Button
            type="button"
            variant="contained"
            color="success"
            disabled={isSubmitting}
            onClick={() => void handleAction('publish')}
          >
            Publish now
          </Button>
          <Button component={Link} href="/notices">
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
