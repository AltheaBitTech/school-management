'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { createStaff } from '@/lib/staff/staff-client';

export default function CreateStaffPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((response) => setDepartments(response.data))
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsForbidden(false);
    setIsSubmitting(true);

    try {
      const staff = await createStaff({
        employeeCode,
        firstName,
        lastName,
        email: email || undefined,
        designation: designation || undefined,
        departmentId: departmentId || undefined,
      });
      router.push(`/staff/${staff.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create staff member');
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
      <Box>
        <Typography variant="h4" component="h1">
          Add staff
        </Typography>
        <Typography color="text.secondary">
          Create an operational staff profile for your school.
        </Typography>
      </Box>

      <Stack spacing={2} maxWidth="sm">
        <TextField
          label="Employee code"
          value={employeeCode}
          onChange={(event) => setEmployeeCode(event.target.value)}
          required
          helperText="Use lowercase letters, numbers, or hyphens"
        />
        <TextField
          label="First name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          required
        />
        <TextField
          label="Last name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          required
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Designation"
          value={designation}
          onChange={(event) => setDesignation(event.target.value)}
        />
        <TextField
          select
          label="Department"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <MenuItem value="">No department</MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={department.id}>
              {department.name}
            </MenuItem>
          ))}
        </TextField>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create staff'}
          </Button>
          <Button component={Link} href="/staff">
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
