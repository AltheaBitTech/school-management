'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import RequestQuoteOutlined from '@mui/icons-material/RequestQuoteOutlined';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import { useCan } from '@/lib/auth/use-can';
import {
  formatCurrency,
  formatFeeDate,
  listFeeStructures,
  type FeeStructure,
} from '@/lib/fees/fees-client';

export default function FeeStructuresPage() {
  const canCreate = useCan('fee.create');
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStructures(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbidden(false);

      try {
        const response = await listFeeStructures({ page: 1, pageSize: 100 });
        if (!cancelled) {
          setStructures(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.statusCode === 403) {
            setIsForbidden(true);
          } else {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load fee structures');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStructures();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <ListPageShell
      title="Fee structures"
      description="Define reusable fee amounts for student assignments."
      icon={RequestQuoteOutlined}
      actions={
        <>
          <Button component={Link} href="/fees" variant="outlined" startIcon={<ArrowBackOutlined />}>
            Back to fees
          </Button>
          {canCreate ? (
            <Button component={Link} href="/fees/structures/new" variant="contained" startIcon={<AddOutlined />}>
              New structure
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading ? <LoadingState label="Loading fee structures" columnCount={6} /> : null}

      {errorMessage && !isLoading ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && structures.length === 0 ? (
        <EmptyState
          icon={RequestQuoteOutlined}
          message="No fee structures found."
          action={
            canCreate ? (
              <Button component={Link} href="/fees/structures/new" variant="contained" startIcon={<AddOutlined />}>
                New structure
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && structures.length > 0 ? (
        <AppTable aria-label="Fee structures">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Installment</TableCell>
              <TableCell>Due date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {structures.map((structure) => (
              <TableRow key={structure.id} hover>
                <TableCell>{structure.name}</TableCell>
                <TableCell>{structure.installmentLabel || '—'}</TableCell>
                <TableCell>{structure.dueDate ? formatFeeDate(structure.dueDate) : '—'}</TableCell>
                <TableCell>{formatCurrency(structure.amount)}</TableCell>
                <TableCell>
                  {formatFeeDate(structure.periodStart)} to {formatFeeDate(structure.periodEnd)}
                </TableCell>
                <TableCell>
                  <StatusChip status={structure.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}
    </ListPageShell>
  );
}
