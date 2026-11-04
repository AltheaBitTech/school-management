'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
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

  const selectedType = leaveTypes.find((type) => type.id === leaveTypeId);

  const dateRangeError = useMemo(() => {
    if (!startDate || !endDate) {
      return null;
    }
    if (endDate < startDate) {
      return 'End date must be on or after the start date.';
    }
    return null;
  }, [endDate, startDate]);

  const canSubmit =
    Boolean(leaveTypeId && startDate && endDate && !dateRangeError) &&
    (!selectedType?.requiresReason || reason.trim().length > 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
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
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to submit leave request');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Submit leave"
        description="Your request will be sent for approval."
        icon={EventAvailableOutlined}
        footer={
          <FormPageFooter
            cancelHref="/staff/leave"
            submitLabel="Submit for approval"
            submittingLabel="Submitting…"
            isSubmitting={isSubmitting}
            submitDisabled={!canSubmit}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <FormSection title="Leave details" maxWidth="100%">
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
            error={Boolean(dateRangeError)}
          />
          <TextField
            label="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            error={Boolean(dateRangeError)}
            helperText={dateRangeError ?? undefined}
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
        </FormSection>
      </FormPageShell>
    </Box>
  );
}
