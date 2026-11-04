'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState } from '@/components/ui/AppTable';
import {
  StudentPortalPageShell,
  StudentPortalSection,
} from '@/components/ui/StudentPortalPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  formatCurrency,
  formatFeeDate,
  formatStudentFeeStatus,
  type StudentFeeDetail,
} from '@/lib/fees/fees-client';
import {
  downloadStudentSelfPaymentReceipt,
  listStudentSelfFees,
} from '@/lib/student-self/student-self-client';

export default function StudentSelfFeesPage() {
  const [fees, setFees] = useState<StudentFeeDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    void listStudentSelfFees({ page: 1, pageSize: 100 })
      .then((response) => setFees(response.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load fees');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDownloadReceipt(
    studentFeeId: string,
    paymentId: string,
  ): Promise<void> {
    setDownloadingId(paymentId);
    setErrorMessage(null);
    try {
      await downloadStudentSelfPaymentReceipt(studentFeeId, paymentId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading fees" />
      </Box>
    );
  }

  return (
    <StudentPortalPageShell
      title="My fees"
      description="View assigned fees, payments, and download receipts."
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {fees.length === 0 ? (
        <EmptyState message="No fee assignments found for your account." />
      ) : (
        fees.map((fee) => (
          <StudentPortalSection key={fee.id}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {fee.feeStructure?.name ?? 'Fee'}
                </Typography>
                <StatusChip status={fee.status} label={formatStudentFeeStatus(fee.status)} />
              </Stack>
              <Typography color="text.secondary">
                Assigned {formatCurrency(fee.assignedAmount)} · Paid {formatCurrency(fee.paidAmount)} ·
                Outstanding {formatCurrency(fee.outstandingAmount)}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Due: {fee.dueDate ? formatFeeDate(fee.dueDate) : '—'}
              </Typography>

              {fee.payments.length === 0 ? (
                <Typography color="text.secondary">No payments recorded yet.</Typography>
              ) : (
                <AppTable aria-label={`Payments for ${fee.feeStructure?.name ?? 'fee'}`}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell align="right">Receipt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fee.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatFeeDate(payment.paymentDate)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            disabled={downloadingId === payment.id}
                            onClick={() => void handleDownloadReceipt(fee.id, payment.id)}
                          >
                            {downloadingId === payment.id ? 'Downloading…' : 'Download receipt'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AppTable>
              )}
            </Stack>
          </StudentPortalSection>
        ))
      )}
    </StudentPortalPageShell>
  );
}
