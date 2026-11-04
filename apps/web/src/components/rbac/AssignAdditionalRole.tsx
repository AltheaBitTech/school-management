'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { FormEvent, useState, type ReactNode } from 'react';
import { useOptionalAuthSession } from '@/components/providers/AuthSessionProvider';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { filterStaffAssignableRoles } from '@/lib/rbac/staff-assignable-roles';
import { assignRoleToUser, listOrganizationRoles, type OrganizationRole } from '@/lib/rbac/roles-client';

export function AssignAdditionalRole({
  userId,
  assignedRoleIds = [],
  onAssigned,
  label = 'Assign another role',
}: {
  userId?: string | null;
  assignedRoleIds?: string[];
  onAssigned?: () => void;
  label?: string;
}) {
  const session = useOptionalAuthSession();
  const { showSuccess } = useAppSnackbar();
  const canAssign = session?.user?.permissions?.includes('role.assign') ?? false;
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [roleId, setRoleId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canAssign || !userId) {
    return null;
  }

  async function openDialog(): Promise<void> {
    setErrorMessage(null);
    setOpen(true);
    try {
      const listed = filterStaffAssignableRoles(await listOrganizationRoles()).filter(
        (role) =>
          role.code !== 'SAAS_SUPER_ADMIN' &&
          role.code !== 'STUDENT' &&
          role.code !== 'PARENT' &&
          !assignedRoleIds.includes(role.id),
      );
      setRoles(listed);
      setRoleId(listed[0]?.id ?? '');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load roles');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!userId || !roleId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await assignRoleToUser(userId, roleId);
      showSuccess('Role assigned. It applies the next time that person signs in and chooses it.');
      setOpen(false);
      onAssigned?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not assign the role');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outlined" size="small" onClick={() => void openDialog()}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <BoxForm onSubmit={handleSubmit}>
          <DialogTitle>Assign another role</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                select
                label="Role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                required
                fullWidth
                helperText="The person chooses this role the next time they sign in. Their current session stays on the role they already selected."
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
              {roles.length === 0 ? (
                <Alert severity="info">No additional roles are available to assign.</Alert>
              ) : null}
              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting || !roleId}>
              {isSubmitting ? 'Assigning…' : 'Assign role'}
            </Button>
          </DialogActions>
        </BoxForm>
      </Dialog>
    </>
  );
}

function BoxForm({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      {children}
    </form>
  );
}
