'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FormEvent, useEffect, useState } from 'react';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { listStaff, type StaffMember } from '@/lib/staff/staff-client';
import {
  createSectionSubstitute,
  formatAttendanceDateLabel,
  listSectionSubstitutes,
  revokeSectionSubstitute,
  type SectionSubstitute,
} from '@/lib/student-attendance/student-attendance-client';

function todayValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function staffName(staff: StaffMember): string {
  return staff.displayName?.trim() || `${staff.firstName} ${staff.lastName}`.trim();
}

export interface SubstituteDialogProps {
  open: boolean;
  onClose: () => void;
  section: { id: string; label: string; classTeacherId: string | null; classTeacherName: string | null } | null;
  /** Pre-fills the date range, e.g. the date selected on the attendance page. */
  defaultDate?: string;
  onChanged?: () => void;
}

/** Lets an admin allow another teacher to take a section's attendance for a date range. */
export function SubstituteDialog({ open, onClose, section, defaultDate, onChanged }: SubstituteDialogProps) {
  const { showSuccess } = useAppSnackbar();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [substitutes, setSubstitutes] = useState<SectionSubstitute[]>([]);
  const [staffId, setStaffId] = useState('');
  const [fromDate, setFromDate] = useState(defaultDate ?? todayValue());
  const [toDate, setToDate] = useState(defaultDate ?? todayValue());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !section) return;
    const start = defaultDate ?? todayValue();
    setStaffId('');
    setFromDate(start);
    setToDate(start);
    setReason(section.classTeacherName ? `${section.classTeacherName} absent` : '');
    setError(null);

    let cancelled = false;
    void Promise.all([
      listStaff({ page: 1, pageSize: 100, employmentStatus: 'ACTIVE', sortBy: 'firstName', sortOrder: 'asc' }),
      listSectionSubstitutes(section.id),
    ])
      .then(([staffResponse, current]) => {
        if (cancelled) return;
        setStaff(staffResponse.data.filter((member) => member.id !== section.classTeacherId));
        setSubstitutes(current);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load staff');
      });
    return () => {
      cancelled = true;
    };
  }, [open, section, defaultDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!section) return;
    if (!staffId) return setError('Choose a teacher');
    if (fromDate > toDate) return setError('Start date must be on or before end date');

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createSectionSubstitute(section.id, {
        staffId,
        fromDate,
        toDate,
        reason: reason.trim() || undefined,
      });
      setSubstitutes((current) => [...current, created].sort((a, b) => a.fromDate.localeCompare(b.fromDate)));
      setStaffId('');
      showSuccess(`${created.staffName ?? 'Substitute'} can take attendance for ${section.label}.`);
      onChanged?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to assign substitute');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(substitute: SectionSubstitute) {
    setRevokingId(substitute.id);
    setError(null);
    try {
      await revokeSectionSubstitute(substitute.id);
      setSubstitutes((current) => current.filter((item) => item.id !== substitute.id));
      onChanged?.();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Failed to revoke substitute');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Dialog open={open} onClose={() => !isSubmitting && onClose()} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>Substitute teacher{section ? ` · ${section.label}` : ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Let another teacher take attendance for this section while
              {section?.classTeacherName ? ` ${section.classTeacherName}` : ' the class teacher'} is away. Access ends
              automatically after the end date.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              select
              label="Teacher"
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              required
            >
              {staff.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {staffName(member)}
                  {member.department?.name ? ` · ${member.department.name}` : ''}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="From"
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  if (event.target.value > toDate) setToDate(event.target.value);
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="To"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                inputProps={{ min: fromDate }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Reason (optional)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              inputProps={{ maxLength: 300 }}
            />

            {substitutes.length > 0 ? (
              <>
                <Divider />
                <Typography variant="subtitle2">Current and upcoming substitutes</Typography>
                <Stack spacing={1}>
                  {substitutes.map((substitute) => (
                    <Stack
                      key={substitute.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="body2">{substitute.staffName ?? 'Staff member'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {substitute.fromDate === substitute.toDate
                            ? formatAttendanceDateLabel(substitute.fromDate)
                            : `${formatAttendanceDateLabel(substitute.fromDate)} – ${formatAttendanceDateLabel(substitute.toDate)}`}
                          {substitute.reason ? ` · ${substitute.reason}` : ''}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        disabled={revokingId === substitute.id}
                        onClick={() => void handleRevoke(substitute)}
                      >
                        {revokingId === substitute.id ? 'Revoking…' : 'Revoke'}
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <SubmitButton isSubmitting={isSubmitting}>Assign substitute</SubmitButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
