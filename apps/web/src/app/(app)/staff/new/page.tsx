'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { listOrganizationRoles, type OrganizationRole } from '@/lib/rbac/roles-client';
import { filterStaffAssignableRoles } from '@/lib/rbac/staff-assignable-roles';
import { createStaff, suggestNextEmployeeCode } from '@/lib/staff/staff-client';

export default function CreateStaffPage() {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<OrganizationRole[]>([]);
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
    void Promise.all([
      listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
      listOrganizationRoles(),
    ])
      .then(([departmentResponse, roleList]) => {
        setDepartments(departmentResponse.data);
        const assignableRoles = filterStaffAssignableRoles(roleList);
        setRoles(assignableRoles);
        const defaultRole =
          assignableRoles.find((role) => role.code === 'TEACHER') ??
          assignableRoles.find((role) => role.code === 'STAFF') ??
          assignableRoles[0];
        if (defaultRole) {
          setRoleId(defaultRole.id);
        }
      })
      .catch(() => undefined);

    void suggestNextEmployeeCode()
      .then(setEmployeeCode)
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsForbidden(false);
    if (!validateEmail(email)) {
      return;
    }
    setIsSubmitting(true);

    try {
      const staff = await createStaff({
        employeeCode,
        firstName,
        lastName,
        email: email.trim(),
        designation: designation || undefined,
        departmentId: departmentId || undefined,
      });
      showSuccess('Staff member created');
      router.push(roleId ? `/staff/${staff.id}?provisionRoleId=${roleId}` : `/staff/${staff.id}`);
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create staff member');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="Add staff"
        description="Create an operational staff profile for your school."
        icon={PersonAddOutlined}
        footer={
          <FormPageFooter
            cancelHref="/staff"
            submitLabel="Create staff"
            submittingLabel="Creating…"
            isSubmitting={isSubmitting}
          />
        }
      >
        <FormSection title="Profile" description="Identity and contact details used for invites." maxWidth="100%">
          <TextField
            label="Employee code"
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            required
            helperText="Suggested next number in sequence (you can edit). Lowercase letters, numbers, or hyphens."
            fullWidth
          />
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

        <FormSection title="Organization" description="Role and department for access and reporting." maxWidth="100%">
          <TextField
            label="Job title"
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
            helperText="Display title on profile (e.g. Senior Teacher). Not used for login permissions."
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
            helperText="Controls portal access when you send a login invite"
            required
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
