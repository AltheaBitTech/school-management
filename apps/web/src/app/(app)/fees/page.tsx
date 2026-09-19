'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { ApiError } from '@/lib/api/client';
import {
  formatCurrency,
  listFeeStructures,
  listStudentFees,
  type FeeStructure,
  type StudentFee,
} from '@/lib/fees/fees-client';

export default function FeesPage() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    async function loadOverview(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const [structuresResponse, studentFeesResponse] = await Promise.all([
          listFeeStructures({ page: 1, pageSize: 5, status: 'ACTIVE' }),
          listStudentFees({ page: 1, pageSize: 5 }),
        ]);
        setStructures(structuresResponse.data);
        setStudentFees(studentFeesResponse.data);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load fees overview');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadOverview();
  }, []);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  const totalOutstanding = studentFees.reduce(
    (total, studentFee) => total + studentFee.outstandingAmount,
    0,
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            Fees
          </Typography>
          <Typography color="text.secondary">
            Manage fee structures, student assignments, and payment collection.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/fees/structures" variant="outlined">
            Fee structures
          </Button>
          <Button component={Link} href="/fees/student-fees" variant="contained">
            Student fees
          </Button>
        </Stack>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Loading fees overview" />
        </Box>
      ) : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && !errorMessage ? (
        <Stack spacing={2}>
          <Alert severity="info">
            Recent assigned fees show {formatCurrency(totalOutstanding)} outstanding across the latest
            assignments.
          </Alert>

          <Box>
            <Typography variant="h6" gutterBottom>
              Active fee structures
            </Typography>
            {structures.length === 0 ? (
              <Alert severity="info">No active fee structures yet.</Alert>
            ) : (
              <Stack spacing={1}>
                {structures.map((structure) => (
                  <Typography key={structure.id}>
                    {structure.name} — {formatCurrency(structure.amount)} ({structure.periodStart}{' '}
                    to {structure.periodEnd})
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Recent student fee assignments
            </Typography>
            {studentFees.length === 0 ? (
              <Alert severity="info">No student fees assigned yet.</Alert>
            ) : (
              <Stack spacing={1}>
                {studentFees.map((studentFee) => (
                  <Typography key={studentFee.id}>
                    <Link href={`/fees/student-fees/${studentFee.id}`}>
                      {studentFee.feeStructure?.name ?? 'Fee assignment'}
                    </Link>{' '}
                    — outstanding {formatCurrency(studentFee.outstandingAmount)}
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      ) : null}
    </Stack>
  );
}
