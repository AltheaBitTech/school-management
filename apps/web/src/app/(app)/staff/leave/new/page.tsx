'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { FormActions, FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import {
  createStaffSelfLeaveRequest,
  listStaffSelfLeaveTypes,
  type StaffSelfLeaveType,
} from '@/lib/staff-self/staff-self-client';

export default function StaffNewLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<StaffSelfLeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void listStaffSelfLeaveTypes({ page: 1, pageSize: 100 })
      .then((response) => setLeaveTypes(response.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        }
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const created = await createStaffSelfLeaveRequest({
        leaveTypeId,
        startDate,
        endDate,
        reason: reason || undefined,
      });
      router.push(`/staff/leave/${created.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to submit leave request');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  const selectedType = leaveTypes.find((type) => type.id === leaveTypeId);

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <PageHeader title="Submit leave" description="Your request will be sent for approval." />

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <FormSection>
        <TextField
          select
          label="Leave type"
          value={leaveTypeId}
          onChange={(event) => setLeaveTypeId(event.target.value)}
          required
          fullWidth
        >
          {leaveTypes.map((type) => (
            <MenuItem key={type.id} value={type.id}>
              {type.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Start date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
        />
        <TextField
          label="End date"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
        />
        <TextField
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required={Boolean(selectedType?.requiresReason)}
          multiline
          minRows={3}
          fullWidth
        />

        <FormActions>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit for approval'}
          </Button>
          <Button component={Link} href="/staff/leave">Cancel</Button>
        </FormActions>
      </FormSection>
    </Stack>
  );
}
