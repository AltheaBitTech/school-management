'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  assignStudentFee,
  formatCurrency,
  formatFeeDate,
  formatStudentFeeStatus,
  getStudentDisplayNameFromFee,
  listFeeStructures,
  listStudentFees,
  STUDENT_FEE_STATUSES,
  type FeeStructure,
  type StudentFee,
  type StudentFeeStatus,
} from '@/lib/fees/fees-client';
import { getStudentDisplayName, listStudents, type Student } from '@/lib/students/students-client';

export default function StudentFeesPage() {
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [studentId, setStudentId] = useState('');
  const [feeStructureId, setFeeStructureId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentFeeStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const [feesResponse, studentsResponse, structuresResponse] = await Promise.all([
        listStudentFees({
          page: 1,
          pageSize: 100,
          status: statusFilter || undefined,
        }),
        listStudents({ page: 1, pageSize: 100, status: 'ACTIVE' }),
        listFeeStructures({ page: 1, pageSize: 100, status: 'ACTIVE' }),
      ]);
      setStudentFees(feesResponse.data);
      setStudents(studentsResponse.data);
      setStructures(structuresResponse.data);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load student fees');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAssign(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await assignStudentFee({
        studentId,
        feeStructureId,
        dueDate: dueDate || undefined,
      });
      setStudentId('');
      setFeeStructureId('');
      setDueDate('');
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to assign student fee');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Student fees
          </Typography>
          <Typography color="text.secondary">
            Assign fee structures to students and track outstanding balances.
          </Typography>
        </Box>
        <Button component={Link} href="/fees" variant="outlined">
          Back to fees
        </Button>
      </Stack>

      <Stack spacing={2} component="form" onSubmit={handleAssign} maxWidth="sm">
        <Typography variant="h6">Assign fee to student</Typography>
        <TextField select label="Student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
          {students.map((student) => (
            <MenuItem key={student.id} value={student.id}>
              {getStudentDisplayName(student)} ({student.studentCode})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Fee structure"
          value={feeStructureId}
          onChange={(e) => setFeeStructureId(e.target.value)}
          required
        >
          {structures.map((structure) => (
            <MenuItem key={structure.id} value={structure.id}>
              {structure.name} — {formatCurrency(structure.amount)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Assigning…' : 'Assign fee'}
        </Button>
      </Stack>

      <TextField
        select
        label="Status"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as StudentFeeStatus | '')}
        sx={{ maxWidth: 260 }}
      >
        <MenuItem value="">All statuses</MenuItem>
        {STUDENT_FEE_STATUSES.map((status) => (
          <MenuItem key={status} value={status}>
            {formatStudentFeeStatus(status)}
          </MenuItem>
        ))}
      </TextField>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Loading student fees" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && studentFees.length === 0 ? (
        <Alert severity="info">No student fees found for the selected filter.</Alert>
      ) : null}

      {!isLoading && studentFees.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Fee structure</TableCell>
                <TableCell>Assigned</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Outstanding</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentFees.map((studentFee) => (
                <TableRow key={studentFee.id} hover>
                  <TableCell>{getStudentDisplayNameFromFee(studentFee.student)}</TableCell>
                  <TableCell>{studentFee.feeStructure?.name ?? '—'}</TableCell>
                  <TableCell>{formatCurrency(studentFee.assignedAmount)}</TableCell>
                  <TableCell>{formatCurrency(studentFee.paidAmount)}</TableCell>
                  <TableCell>{formatCurrency(studentFee.outstandingAmount)}</TableCell>
                  <TableCell>{formatStudentFeeStatus(studentFee.status)}</TableCell>
                  <TableCell>
                    {studentFee.dueDate ? formatFeeDate(studentFee.dueDate) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Button component={Link} href={`/fees/student-fees/${studentFee.id}`} size="small">
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
