'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { AppTable, EmptyState, LoadingState, TableIconLink } from '@/components/ui/AppTable';
import { FormActions, FormSection } from '@/components/ui/FormSection';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
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
  const canAssign = useCan('fee.assign');
  const { showSuccess } = useAppSnackbar();
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
      showSuccess('Fee assigned to student');
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
    <ListPageShell
      title="Student fees"
      description="Assign fee structures to students and track outstanding balances."
      icon={PaymentsOutlined}
      actions={
        <Button component={Link} href="/fees" variant="outlined" startIcon={<ArrowBackOutlined />}>
          Back to fees
        </Button>
      }
      filters={
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
      }
    >
      {canAssign ? <FormSection title="Assign fee to student">
        <Stack spacing={2} component="form" onSubmit={handleAssign}>
          <TextField
            select
            label="Student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            fullWidth
          >
            <MenuItem value="">Select student</MenuItem>
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
            fullWidth
          >
            <MenuItem value="">Select fee structure</MenuItem>
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
            fullWidth
          />
          <FormActions>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning…' : 'Assign fee'}
            </Button>
          </FormActions>
        </Stack>
      </FormSection> : null}

      {isLoading ? <LoadingState label="Loading student fees" columnCount={8} /> : null}

      {errorMessage && !isLoading ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && studentFees.length === 0 ? (
        <EmptyState icon={PaymentsOutlined} message="No student fees found for the selected filter." />
      ) : null}

      {!isLoading && studentFees.length > 0 ? (
        <AppTable minWidth={960} aria-label="Student fees">
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
                <TableCell>
                  <StatusChip
                    status={studentFee.status}
                    label={formatStudentFeeStatus(studentFee.status)}
                  />
                </TableCell>
                <TableCell>
                  {studentFee.dueDate ? formatFeeDate(studentFee.dueDate) : '—'}
                </TableCell>
                <TableCell align="right">
                  <TableIconLink href={`/fees/student-fees/${studentFee.id}`} label="View fee assignment" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </ListPageShell>
  );
}
