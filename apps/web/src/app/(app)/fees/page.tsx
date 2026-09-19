'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { EmptyState, LoadingState } from '@/components/ui/AppTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  formatCurrency,
  formatStudentFeeStatus,
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

  const totalAssigned = studentFees.reduce((total, studentFee) => total + studentFee.assignedAmount, 0);
  const totalPaid = studentFees.reduce((total, studentFee) => total + studentFee.paidAmount, 0);
  const totalOutstanding = studentFees.reduce(
    (total, studentFee) => total + studentFee.outstandingAmount,
    0,
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Fees"
        description="Manage fee structures and student payments."
        actions={
          <>
            <Button component={Link} href="/fees/structures" variant="outlined">
              Fee structures
            </Button>
            <Button component={Link} href="/fees/student-fees" variant="contained">
              Student fees
            </Button>
          </>
        }
      />

      {isLoading ? <LoadingState label="Loading fees overview" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && !errorMessage ? (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            }}
          >
            <SummaryCard label="Assigned" value={formatCurrency(totalAssigned)} hint="Latest assignments" />
            <SummaryCard label="Paid" value={formatCurrency(totalPaid)} hint="Latest assignments" />
            <SummaryCard
              label="Outstanding"
              value={formatCurrency(totalOutstanding)}
              hint="Latest assignments"
            />
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Active fee structures
            </Typography>
            {structures.length === 0 ? (
              <EmptyState message="No active fee structures yet." />
            ) : (
              <Stack spacing={1.25}>
                {structures.map((structure) => (
                  <Card key={structure.id} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{structure.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {structure.periodStart} to {structure.periodEnd}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 600 }}>{formatCurrency(structure.amount)}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Recent student fee assignments
            </Typography>
            {studentFees.length === 0 ? (
              <EmptyState message="No student fees assigned yet." />
            ) : (
              <Stack spacing={1.25}>
                {studentFees.map((studentFee) => (
                  <Card key={studentFee.id} variant="outlined">
                    <CardActionArea component={Link} href={`/fees/student-fees/${studentFee.id}`}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={1}
                          alignItems={{ sm: 'center' }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 600 }}>
                              {studentFee.feeStructure?.name ?? 'Fee assignment'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Outstanding {formatCurrency(studentFee.outstandingAmount)}
                            </Typography>
                          </Box>
                          <StatusChip
                            status={studentFee.status}
                            label={formatStudentFeeStatus(studentFee.status)}
                          />
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      ) : null}
    </Stack>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.75 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}
