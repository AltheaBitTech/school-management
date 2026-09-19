'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { FormActions, FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  createDepartment,
  listDepartments,
  updateDepartment,
  type Department,
} from '@/lib/departments/departments-client';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadDepartments(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const response = await listDepartments({ page: 1, pageSize: 100 });
      setDepartments(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load departments');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createDepartment({ name, code });
      setName('');
      setCode('');
      await loadDepartments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit(departmentId: string): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await updateDepartment(departmentId, { name: editingName });
      setEditingId(null);
      setEditingName('');
      await loadDepartments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update department');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Departments"
        description="Maintain the departments used for staff assignment."
      />

      <FormSection title="Create department">
        <Stack spacing={2} component="form" onSubmit={handleCreate}>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
          <TextField
            label="Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            helperText="Lowercase letters, numbers, or hyphens"
            fullWidth
          />
          <FormActions>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create department'}
            </Button>
          </FormActions>
        </Stack>
      </FormSection>

      {isLoading ? <LoadingState label="Loading departments" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && departments.length === 0 ? (
        <EmptyState message="No departments yet. Create one to assign staff members." />
      ) : null}

      {!isLoading && departments.length > 0 ? (
        <AppTable aria-label="Departments">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell>
                    {editingId === department.id ? (
                      <TextField
                        size="small"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                    ) : (
                      department.name
                    )}
                  </TableCell>
                  <TableCell>{department.code}</TableCell>
                  <TableCell>
                    <StatusChip status={department.status} />
                  </TableCell>
                  <TableCell align="right">
                    {editingId === department.id ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => void handleSaveEdit(department.id)} disabled={isSubmitting}>
                          Save
                        </Button>
                        <Button size="small" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </Stack>
                    ) : (
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingId(department.id);
                          setEditingName(department.name);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </AppTable>
      ) : null}
    </Stack>
  );
}
