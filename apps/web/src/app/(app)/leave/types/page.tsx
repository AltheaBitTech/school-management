'use client';

import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormSection } from '@/components/ui/FormSection';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { requiredText } from '@/lib/forms/field-rules';
import { createLeaveType, listLeaveTypes, updateLeaveType, type LeaveType } from '@/lib/leave/leave-client';

export default function LeaveTypesPage() {
  const { showSuccess } = useAppSnackbar();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [deactivateTarget, setDeactivateTarget] = useState<LeaveType | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  async function loadLeaveTypes(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const response = await listLeaveTypes({ page: 1, pageSize: 100 });
      setLeaveTypes(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load leave types');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaveTypes();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextNameError = requiredText(name, 'Name', 2);
    const nextCodeError = requiredText(code, 'Code', 2);
    setNameError(nextNameError);
    setCodeError(nextCodeError);
    if (nextNameError || nextCodeError) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createLeaveType({ name, code, requiresReason: true, tracksBalance: true });
      setName('');
      setCode('');
      showSuccess('Leave type created');
      await loadLeaveTypes();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create leave type');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateConfirmed(): Promise<void> {
    if (!deactivateTarget) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await updateLeaveType(deactivateTarget.id, { active: false });
      showSuccess('Leave type deactivated');
      setDeactivateTarget(null);
      await loadLeaveTypes();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to deactivate leave type');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <ListPageShell
      title="Leave types"
      description="Configure the leave categories available in your organization."
      icon={EventBusyOutlined}
      actions={
        <Button component={Link} href="/leave" variant="text">
          Back to leave requests
        </Button>
      }
    >

      <Box component="form" onSubmit={handleCreate}>
        <FormSection title="Create leave type" description="Name and code used on leave requests.">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameError(requiredText(name, 'Name', 2))}
            error={Boolean(nameError)}
            helperText={nameError ?? 'Shown on leave requests'}
            required
          />
          <TextField
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => setCodeError(requiredText(code, 'Code', 2))}
            error={Boolean(codeError)}
            helperText={codeError ?? 'Lowercase letters, numbers, or hyphens'}
            required
          />
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create leave type'}
          </Button>
        </FormSection>
      </Box>

      {isLoading ? <LoadingState label="Loading leave types" columnCount={4} /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && leaveTypes.length === 0 ? (
        <EmptyState icon={EventBusyOutlined} message="No leave types configured yet. Add one above." />
      ) : null}

      {!isLoading && leaveTypes.length > 0 ? (
        <AppTable minWidth={640} aria-label="Leave types">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveTypes.map((leaveType) => (
                <TableRow key={leaveType.id} hover>
                  <TableCell>{leaveType.name}</TableCell>
                  <TableCell>{leaveType.code}</TableCell>
                  <TableCell>
                    <StatusChip status={leaveType.active ? 'ACTIVE' : 'INACTIVE'} />
                  </TableCell>
                  <TableCell align="right">
                    {leaveType.active ? (
                      <Button size="small" onClick={() => setDeactivateTarget(leaveType)} disabled={isSubmitting}>
                        Deactivate
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </AppTable>
      ) : null}

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate leave type?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} will no longer be available for new leave requests.`
            : ''
        }
        confirmLabel="Deactivate"
        confirmColor="warning"
        isConfirming={isSubmitting}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => void handleDeactivateConfirmed()}
      />
    </ListPageShell>
  );
}
