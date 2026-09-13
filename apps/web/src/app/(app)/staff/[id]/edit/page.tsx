'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { listDepartments, type Department } from '@/lib/departments/departments-client';
import { getStaff, updateStaff } from '@/lib/staff/staff-client';

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const [staff, departmentResponse] = await Promise.all([
          getStaff(params.id),
          listDepartments({ page: 1, pageSize: 100, status: 'ACTIVE' }),
        ]);

        if (!cancelled) {
          setFirstName(staff.firstName);
          setLastName(staff.lastName);
          setEmail(staff.email ?? '');
          setDesignation(staff.designation ?? '');
          setDepartmentId(staff.departmentId ?? '');
          setDepartments(departmentResponse.data);
        }
      } catch (error) {
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
    setIsSubmitting(true);

    try {
      await updateStaff(params.id, {
        firstName,
        lastName,
        email: email || null,
        designation: designation || null,
        departmentId: departmentId || null,
      });
      router.push(`/staff/${params.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to update staff member');
      }
    } finally {
      setIsSubmitting(false);
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
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Box>
        <Typography variant="h4" component="h1">
          Edit staff
        </Typography>
        <Typography color="text.secondary">Update operational staff details.</Typography>
      </Box>

      <Stack spacing={2} maxWidth="sm">
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
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
          <Button component={Link} href={`/staff/${params.id}`}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
