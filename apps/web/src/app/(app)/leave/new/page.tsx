'use client';

import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { createLeaveRequest, listLeaveTypes, type LeaveType } from '@/lib/leave/leave-client';
import { listStaff, type StaffMember } from '@/lib/staff/staff-client';

export default function NewLeaveRequestPage() {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [staffId, setStaffId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([
      listStaff({ page: 1, pageSize: 100, sortBy: 'firstName', sortOrder: 'asc' }),
      listLeaveTypes({ page: 1, pageSize: 100 }),
    ])
      .then(([staffResponse, leaveTypeResponse]) => {
        setStaff(staffResponse.data.filter((member) => member.employmentStatus !== 'OFFBOARDED'));
        setLeaveTypes(leaveTypeResponse.data.filter((type) => type.active));
      })
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        }
      });
  }, []);

  const dateRangeError = useMemo(() => {
    if (!startDate || !endDate) {
      return null;
    }
    if (endDate < startDate) {
      return 'End date must be on or after the start date.';
    }
    return null;
  }, [endDate, startDate]);

  const canSubmit = Boolean(staffId && leaveTypeId && startDate && endDate && !dateRangeError);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      setErrorMessage(dateRangeError);
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await createLeaveRequest({
        staffId,
        leaveTypeId,
        startDate,
        endDate,
        reason: reason || undefined,
      });
      showSuccess('Leave request submitted');
      router.push('/leave');
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
        title="New leave request"
        description="Submit a leave request for approval."
        icon={EventAvailableOutlined}
        footer={
          <FormPageFooter
            cancelHref="/leave"
            submitLabel="Submit request"
            submittingLabel="Submitting…"
            isSubmitting={isSubmitting}
            submitDisabled={!canSubmit}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      <FormSection title="Request" description="Who is away, and for which dates." maxWidth="100%">
        <TextField select label="Staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} required fullWidth>
          {staff.map((member) => (
            <MenuItem key={member.id} value={member.id}>
              {member.displayName || `${member.firstName} ${member.lastName}`}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Leave type"
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
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
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
        />
        <TextField
          label="End date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
          error={Boolean(dateRangeError)}
          helperText={dateRangeError ?? undefined}
        />
        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          helperText="Optional context for the approver"
        />
      </FormSection>
      </FormPageShell>
    </Box>
  );
}
