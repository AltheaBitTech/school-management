'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { filterStaffAssignableRoles } from '@/lib/rbac/staff-assignable-roles';
import { listOrganizationRoles, type OrganizationRole } from '@/lib/rbac/roles-client';
import { getStaff, updateStaff } from '@/lib/staff/staff-client';

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  function validateEmail(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError('Work email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const [staff, departmentResponse, roleList] = await Promise.all([
          getStaff(params.id),
          listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
          listOrganizationRoles(),
        ]);

        if (!cancelled) {
          setFirstName(staff.firstName);
          setLastName(staff.lastName);
          setEmail(staff.email ?? '');
          setDesignation(staff.designation ?? '');
          setDepartmentId(staff.departmentId ?? '');
          setDepartments(departmentResponse.data);
          const assignableRoles = filterStaffAssignableRoles(roleList);
          setRoles(assignableRoles);
          setRoleId(
            staff.loginRole?.id ??
              assignableRoles.find((role) => role.code === 'TEACHER')?.id ??
              assignableRoles[0]?.id ??
              '',
          );
        }
      } catch (error) {
      resetSubmitting(setIsSubmitting);
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setIsForbidden(true);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load staff member');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    if (!validateEmail(email)) {
      return;
    }
    setIsSubmitting(true);

    try {
      await updateStaff(params.id, {
        firstName,
        lastName,
        email: email.trim(),
        designation: designation || null,
        departmentId: departmentId || null,
      });
      showSuccess('Staff profile updated');
      router.push(
        roleId ? `/staff/${params.id}?provisionRoleId=${roleId}` : `/staff/${params.id}`,
      );
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to update staff member');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading staff profile" />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Edit staff"
        description="Update operational staff details."
        icon={EditOutlined}
        actions={
          <Button component={Link} href={`/staff/${params.id}`} variant="outlined" size="small">
            View profile
          </Button>
        }
        footer={
          <FormPageFooter
            cancelHref={`/staff/${params.id}`}
            submitLabel="Save changes"
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
          />
        }
      >
        <FormSection title="Profile" maxWidth="100%">
          <TextField
            label="First name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Last name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Work email *"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) {
                validateEmail(event.target.value);
              }
            }}
            onBlur={() => validateEmail(email)}
            required
            error={Boolean(emailError)}
            helperText={emailError ?? 'Used to send the login invite'}
            fullWidth
          />
        </FormSection>

        <FormSection title="Organization" maxWidth="100%">
          <TextField
            label="Job title"
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
            helperText="Display title on profile. Not used for login permissions."
            fullWidth
          />
          <TextField
            select
            label="Department"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            fullWidth
          >
            <MenuItem value="">No department</MenuItem>
            {departments.map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="System role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            helperText="Used when provisioning a login invite for this staff member"
            fullWidth
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>
        </FormSection>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </FormPageShell>
    </Box>
  );
}
