'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { FormActions, FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { createLeaveRequest, listLeaveTypes, type LeaveType } from '@/lib/leave/leave-client';
import { listStaff, type StaffMember } from '@/lib/staff/staff-client';

export default function NewLeaveRequestPage() {
  const router = useRouter();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
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
      router.push('/leave');
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

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <PageHeader
        title="New leave request"
        description="Submit a leave request for approval."
      />

      <FormSection>
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
        />
        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={3}
          fullWidth
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <FormActions>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit request'}
          </Button>
          <Button component={Link} href="/leave">
            Cancel
          </Button>
        </FormActions>
      </FormSection>
    </Stack>
  );
}
