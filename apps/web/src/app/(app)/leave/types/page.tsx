'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import { createLeaveType, listLeaveTypes, updateLeaveType, type LeaveType } from '@/lib/leave/leave-client';

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
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
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createLeaveType({ name, code, requiresReason: true, tracksBalance: true });
      setName('');
      setCode('');
      await loadLeaveTypes();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create leave type');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(leaveType: LeaveType): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await updateLeaveType(leaveType.id, { active: false });
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
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1">
          Leave types
        </Typography>
        <Typography color="text.secondary">
          Configure the leave categories available in your organization.
        </Typography>
      </Box>

      <Stack spacing={2} component="form" onSubmit={handleCreate} maxWidth="sm">
        <Typography variant="h6">Create leave type</Typography>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          helperText="Lowercase letters, numbers, or hyphens"
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create leave type'}
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Loading leave types" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && leaveTypes.length === 0 ? (
        <Alert severity="info">No leave types configured yet.</Alert>
      ) : null}

      {!isLoading && leaveTypes.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
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
                <TableRow key={leaveType.id}>
                  <TableCell>{leaveType.name}</TableCell>
                  <TableCell>{leaveType.code}</TableCell>
                  <TableCell>{leaveType.active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell align="right">
                    {leaveType.active ? (
                      <Button size="small" onClick={() => void handleDeactivate(leaveType)} disabled={isSubmitting}>
                        Deactivate
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      <Button component={Link} href="/leave">
        Back to leave requests
      </Button>
    </Stack>
  );
}
