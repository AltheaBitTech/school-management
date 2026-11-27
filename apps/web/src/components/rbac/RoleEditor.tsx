'use client';

import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { PermissionPicker } from '@/components/rbac/PermissionPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  createOrganizationRole,
  getOrganizationRole,
  getPermissionCatalog,
  resetOrganizationRole,
  updateOrganizationRole,
  type OrganizationRoleDetail,
  type PermissionCatalogGroup,
} from '@/lib/rbac/roles-client';

interface RoleEditorProps {
  /** Omit to create a new role. */
  roleId?: string;
}

const ROLES_HREF = '/settings/roles';

export function RoleEditor({ roleId }: RoleEditorProps) {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const canUpdate = useCan('role.update');
  const canCreate = useCan('role.create');
  const isNew = !roleId;

  const [catalog, setCatalog] = useState<PermissionCatalogGroup[]>([]);
  const [role, setRole] = useState<OrganizationRoleDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function applyRole(detail: OrganizationRoleDetail): void {
    setRole(detail);
    setName(detail.name);
    setDescription(detail.description ?? '');
    setSelected(new Set(detail.permissions));
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      try {
        const [groups, detail] = await Promise.all([
          getPermissionCatalog(),
          roleId ? getOrganizationRole(roleId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCatalog(groups);
        if (detail) applyRole(detail);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load role');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  const permissionsLocked = Boolean(role?.isLocked) || (isNew ? !canCreate : !canUpdate);
  const nameLocked = Boolean(role?.isSystem) || (isNew ? !canCreate : !canUpdate);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setErrorMessage('Role name must be 2 to 60 characters');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const permissions = [...selected].sort();
      if (isNew) {
        const created = await createOrganizationRole({
          name: trimmedName,
          description: description.trim() || undefined,
          permissions,
        });
        showSuccess(`Role "${created.name}" created`);
        router.push(ROLES_HREF);
        return;
      }

      const updated = await updateOrganizationRole(roleId, {
        ...(role?.isSystem ? {} : { name: trimmedName }),
        description: description.trim(),
        ...(role?.isLocked ? {} : { permissions }),
      });
      applyRole(updated);
      showSuccess('Role saved. Changes apply to users on their next action.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset(): Promise<void> {
    if (!roleId) return;
    setIsResetting(true);
    setErrorMessage(null);
    try {
      applyRole(await resetOrganizationRole(roleId));
      showSuccess('Role restored to default permissions');
      setIsResetOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reset role');
    } finally {
      setIsResetting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading role" />
      </Box>
    );
  }

  const canReset = Boolean(role?.isSystem && role.isCustomized && !role.isLocked && canUpdate);

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <FormPageShell
        title={isNew ? 'New role' : role?.name ?? 'Role'}
        description={
          isNew
            ? 'Create a role and choose which features its users can access.'
            : 'Choose which features users with this role can access.'
        }
        icon={AdminPanelSettingsOutlined}
        maxWidth={880}
        actions={
          canReset ? (
            <Button
              variant="outlined"
              startIcon={<RestartAltOutlined />}
              onClick={() => setIsResetOpen(true)}
            >
              Reset to default
            </Button>
          ) : undefined
        }
        footer={
          permissionsLocked && nameLocked ? undefined : (
            <FormPageFooter
              cancelHref={ROLES_HREF}
              submitLabel={isNew ? 'Create role' : 'Save changes'}
              submittingLabel={isNew ? 'Creating…' : 'Saving…'}
              isSubmitting={isSubmitting}
            />
          )
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {role?.isLocked ? (
          <Alert severity="info">
            {role.name} always has full access so your institution is never locked out. Its
            permissions cannot be changed.
          </Alert>
        ) : null}

        {role?.isSystem && !role.isLocked ? (
          <Alert severity="info">
            This is a built-in role. You can add or remove features; use &quot;Reset to default&quot; to
            undo your changes.
          </Alert>
        ) : null}

        <FormSection title="Details">
          <Stack spacing={2}>
            <TextField
              label="Role name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={nameLocked}
              helperText={role?.isSystem ? 'Built-in role names cannot be changed' : 'For example: Librarian, Vice Principal'}
              inputProps={{ maxLength: 60 }}
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isNew ? !canCreate : !canUpdate}
              inputProps={{ maxLength: 255 }}
              multiline
              minRows={2}
              fullWidth
            />
            {role ? (
              <TextField label="Role code" value={role.code} disabled fullWidth helperText="Use this code in the staff CSV import" />
            ) : null}
          </Stack>
        </FormSection>

        <FormSection
          title={`Features (${selected.size} selected)`}
          description="Users see a module in the sidebar once they have at least one of its permissions."
        >
          <PermissionPicker
            groups={catalog}
            selected={selected}
            onChange={setSelected}
            disabled={permissionsLocked}
          />
          {!role?.isSystem ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              A few workflows are tied to built-in roles: leave approval goes to the Principal, and the
              parent and student portals use the Parent and Student roles. A custom role gets exactly the
              permissions selected here.
            </Alert>
          ) : null}
        </FormSection>
      </FormPageShell>

      <ConfirmDialog
        open={isResetOpen}
        title="Reset to default permissions?"
        description={`${role?.name ?? 'This role'} will go back to the permissions it shipped with. Your changes will be lost.`}
        confirmLabel="Reset"
        confirmColor="warning"
        isConfirming={isResetting}
        onConfirm={() => void handleReset()}
        onCancel={() => setIsResetOpen(false)}
      />
    </form>
  );
}
