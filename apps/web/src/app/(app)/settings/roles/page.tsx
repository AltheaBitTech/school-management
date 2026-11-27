'use client';

import AddOutlined from '@mui/icons-material/AddOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  deleteOrganizationRole,
  listOrganizationRoles,
  type OrganizationRole,
} from '@/lib/rbac/roles-client';

export default function RolesPage() {
  const canCreate = useCan('role.create');
  const canUpdate = useCan('role.update');
  const canDelete = useCan('role.delete');
  const { showSuccess } = useAppSnackbar();
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrganizationRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadRoles(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setRoles(await listOrganizationRoles());
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load roles');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRoles();
  }, []);

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteOrganizationRole(pendingDelete.id);
      showSuccess(`Role "${pendingDelete.name}" deleted`);
      setPendingDelete(null);
      await loadRoles();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete role');
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <ListPageShell
      title="Roles & permissions"
      description="Create roles for your institution and choose which features each role can use."
      icon={AdminPanelSettingsOutlined}
      actions={
        canCreate ? (
          <Button component={Link} href="/settings/roles/new" variant="contained" startIcon={<AddOutlined />}>
            New role
          </Button>
        ) : undefined
      }
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {isLoading ? <LoadingState label="Loading roles" columnCount={5} /> : null}

      {!isLoading && roles.length === 0 ? (
        <EmptyState icon={AdminPanelSettingsOutlined} message="No roles found." />
      ) : null}

      {!isLoading && roles.length > 0 ? (
        <AppTable aria-label="Roles">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Features</TableCell>
              <TableCell align="right">Users</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {role.name}
                  </Typography>
                  {role.description ? (
                    <Typography variant="caption" color="text.secondary">
                      {role.description}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={role.isSystem ? 'Built-in' : 'Custom'}
                      color={role.isSystem ? 'default' : 'primary'}
                      variant="outlined"
                    />
                    {role.isCustomized ? <Chip size="small" label="Edited" color="warning" variant="outlined" /> : null}
                  </Stack>
                </TableCell>
                <TableCell align="right">{role.permissionCount ?? '—'}</TableCell>
                <TableCell align="right">{role.userCount ?? '—'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" component={Link} href={`/settings/roles/${role.id}`}>
                      {canUpdate && !role.isLocked ? 'Edit' : 'View'}
                    </Button>
                    {canDelete && !role.isSystem ? (
                      <Button size="small" color="error" onClick={() => setPendingDelete(role)}>
                        Delete
                      </Button>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete role?"
        description={
          pendingDelete && (pendingDelete.userCount ?? 0) > 0
            ? `"${pendingDelete.name}" is assigned to ${pendingDelete.userCount} user(s). Remove it from them before deleting.`
            : `"${pendingDelete?.name ?? ''}" will be permanently deleted.`
        }
        confirmLabel="Delete"
        confirmColor="error"
        isConfirming={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </ListPageShell>
  );
}
