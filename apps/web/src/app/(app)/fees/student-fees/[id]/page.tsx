'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  FEE_PAYMENT_METHODS,
  formatCurrency,
  formatFeeDate,
  formatFeePaymentMethod,
  formatStudentFeeStatus,
  getStudentDisplayNameFromFee,
  getStudentFee,
  recordStudentFeePayment,
  type FeePaymentMethod,
  type StudentFeeDetail,
} from '@/lib/fees/fees-client';

export default function StudentFeeDetailPage() {
  const params = useParams<{ id: string }>();
  const studentFeeId = params.id;

  const [studentFee, setStudentFee] = useState<StudentFeeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<FeePaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStudentFee = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);
    setIsNotFound(false);

    try {
      const data = await getStudentFee(studentFeeId);
      setStudentFee(data);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else if (error instanceof ApiError && error.statusCode === 404) {
        setIsNotFound(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load student fee');
      }
    } finally {
      setIsLoading(false);
    }
  }, [studentFeeId]);

  useEffect(() => {
    void loadStudentFee();
  }, [loadStudentFee]);

  function openPaymentDialog(): void {
    if (!studentFee) return;
    setPaymentAmount(String(studentFee.outstandingAmount));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('CASH');
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentDialogOpen(true);
  }

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!studentFee) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await recordStudentFeePayment(studentFee.id, {
        amount: Number(paymentAmount),
        paymentDate,
        paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
      setStudentFee(result.studentFee);
      setSuccessMessage('Payment recorded successfully.');
      setPaymentDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isNotFound) {
    return <Alert severity="warning">Student fee not found.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Student fee details
          </Typography>
          <Typography color="text.secondary">
            Review balances, payment history, and record new payments.
          </Typography>
        </Box>
        <Button component={Link} href="/fees/student-fees" variant="outlined">
          Back to student fees
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Loading student fee details" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      {!isLoading && studentFee ? (
        <>
          <Stack spacing={1}>
            <Typography variant="h6">{studentFee.feeStructure?.name ?? 'Fee assignment'}</Typography>
            <Typography color="text.secondary">
              {getStudentDisplayNameFromFee(studentFee.student)}
            </Typography>
            <Typography>
              Assigned: {formatCurrency(studentFee.assignedAmount)} | Paid:{' '}
              {formatCurrency(studentFee.paidAmount)} | Outstanding:{' '}
              {formatCurrency(studentFee.outstandingAmount)}
            </Typography>
            <Typography>Status: {formatStudentFeeStatus(studentFee.status)}</Typography>
            <Typography>
              Due date: {studentFee.dueDate ? formatFeeDate(studentFee.dueDate) : '—'}
            </Typography>
          </Stack>

          {studentFee.status !== 'PAID' ? (
            <Box>
              <Button variant="contained" onClick={openPaymentDialog}>
                Record payment
              </Button>
            </Box>
          ) : null}

          <Box sx={{ overflowX: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Payment history
            </Typography>
            {studentFee.payments.length === 0 ? (
              <Alert severity="info">No payments recorded yet.</Alert>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentFee.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatFeeDate(payment.paymentDate)}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{formatFeePaymentMethod(payment.paymentMethod)}</TableCell>
                      <TableCell>{payment.reference ?? '—'}</TableCell>
                      <TableCell>{payment.notes ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </>
      ) : null}

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleRecordPayment}>
          <DialogTitle>Record payment</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {studentFee ? (
                <Alert severity="info">
                  Assigned: {formatCurrency(studentFee.assignedAmount)} | Paid:{' '}
                  {formatCurrency(studentFee.paidAmount)} | Outstanding:{' '}
                  {formatCurrency(studentFee.outstandingAmount)}
                </Alert>
              ) : null}
              <TextField
                label="Amount"
                type="number"
                inputProps={{
                  min: 0.01,
                  step: 0.01,
                  max: studentFee?.outstandingAmount,
                }}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
              <TextField
                label="Payment date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                select
                label="Payment method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as FeePaymentMethod)}
                required
              >
                {FEE_PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method} value={method}>
                    {formatFeePaymentMethod(method)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
              <TextField
                label="Notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                multiline
                minRows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Recording…' : 'Record payment'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
