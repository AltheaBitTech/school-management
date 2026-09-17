'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  formatStudentDate,
  formatStudentStatus,
  getStudentDisplayName,
  listStudents,
  STUDENT_STATUSES,
  type Student,
  type StudentStatus,
} from '@/lib/students/students-client';

function statusColor(status: StudentStatus): 'success' | 'default' {
  return status === 'ACTIVE' ? 'success' : 'default';
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listStudents({
          page: 1,
          pageSize: 100,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        });
        if (!cancelled) {
          setStudents(response.data);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load students');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [search, statusFilter]);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Students
          </Typography>
          <Typography color="text.secondary">
            Manage minimal student records used for document generation and school operations.
          </Typography>
        </Box>
        <Button component={Link} href="/students/new" variant="contained">
          Add student
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
        <TextField
          label="Search students"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, student code, or class"
          sx={{ minWidth: 280 }}
        />
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StudentStatus | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STUDENT_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {formatStudentStatus(status)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading students" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && students.length === 0 ? (
        <Alert severity="info">No students found. Add a student to begin using document generation.</Alert>
      ) : null}

      {!isLoading && students.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.studentCode}</TableCell>
                  <TableCell>{getStudentDisplayName(student)}</TableCell>
                  <TableCell>{student.className || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatStudentStatus(student.status)}
                      color={statusColor(student.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatStudentDate(student.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/students/${student.id}`} size="small">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}
    </Stack>
  );
}
