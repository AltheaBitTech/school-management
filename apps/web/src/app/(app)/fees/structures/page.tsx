'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { FormActions, FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError } from '@/lib/api/client';
import {
  createFeeStructure,
  formatCurrency,
  formatFeeDate,
  listFeeStructures,
  type FeeStructure,
} from '@/lib/fees/fees-client';

export default function FeeStructuresPage() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  async function loadStructures(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const response = await listFeeStructures({ page: 1, pageSize: 100 });
      setStructures(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load fee structures');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStructures();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createFeeStructure({
        name,
        description: description || undefined,
        amount: Number(amount),
        periodStart,
        periodEnd,
      });
      setName('');
      setDescription('');
      setAmount('');
      setPeriodStart('');
      setPeriodEnd('');
      await loadStructures();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create fee structure');
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
        title="Fee structures"
        description="Define reusable fee amounts for student assignments."
        actions={
          <Button component={Link} href="/fees" variant="outlined">
            Back to fees
          </Button>
        }
      />

      <FormSection title="Create fee structure">
        <Stack spacing={2} component="form" onSubmit={handleCreate}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Amount"
            type="number"
            inputProps={{ min: 0.01, step: 0.01 }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Period start"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          <TextField
            label="Period end"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />
          <FormActions>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create fee structure'}
            </Button>
          </FormActions>
        </Stack>
      </FormSection>

      {isLoading ? <LoadingState label="Loading fee structures" /> : null}

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!isLoading && structures.length === 0 ? (
        <EmptyState message="No fee structures found." />
      ) : null}

      {!isLoading && structures.length > 0 ? (
        <AppTable aria-label="Fee structures">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {structures.map((structure) => (
              <TableRow key={structure.id} hover>
                <TableCell>{structure.name}</TableCell>
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
    </Stack>
  );
}
