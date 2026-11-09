'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import RequestQuoteOutlined from '@mui/icons-material/RequestQuoteOutlined';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError } from '@/lib/api/client';
import { createFeeStructure } from '@/lib/fees/fees-client';
import { validateDateRange, validatePositiveAmount, validateRequiredMaxLength } from '@/lib/forms/validators';

export default function NewFeeStructurePage() {
  const router = useRouter();
  const { showSuccess } = useAppSnackbar();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [installmentLabel, setInstallmentLabel] = useState('');
  const [installmentDueDate, setInstallmentDueDate] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsForbidden(false);
    const nameProblem = validateRequiredMaxLength(name, 'Name', 120);
    const amountProblem = validatePositiveAmount(amount);
    const periodProblem = validateDateRange(periodStart, periodEnd);
    const descriptionProblem =
      description.trim().length > 0
        ? validateRequiredMaxLength(description, 'Description', 500)
        : undefined;
    if (nameProblem || amountProblem || periodProblem || descriptionProblem) {
      setErrorMessage(nameProblem ?? amountProblem ?? periodProblem ?? descriptionProblem ?? null);
      return;
    }
    setIsSubmitting(true);

    try {
      await createFeeStructure({
        name: name.trim(),
        description: description.trim() || undefined,
        amount: Number(amount),
        periodStart,
        periodEnd,
        installmentLabel: installmentLabel || undefined,
        dueDate: installmentDueDate || undefined,
        academicYear: academicYear || undefined,
      });
      showSuccess('Fee structure created');
      router.push('/fees/structures');
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create fee structure');
      }
    }
  }

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormPageShell
        title="New fee structure"
        description="Define a reusable fee amount for student assignments."
        icon={RequestQuoteOutlined}
        footer={
          <FormPageFooter
            cancelHref="/fees/structures"
            submitLabel="Create fee structure"
            submittingLabel="Creating…"
            isSubmitting={isSubmitting}
          />
        }
      >
        <FormSection title="Structure details" maxWidth="100%">
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
        </FormSection>

        <FormSection title="Period & installments" maxWidth="100%">
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
          <TextField
            label="Installment label"
            value={installmentLabel}
            onChange={(e) => setInstallmentLabel(e.target.value)}
            placeholder="Term 1, Annual, etc."
            fullWidth
          />
          <TextField
            label="Installment due date"
            type="date"
            value={installmentDueDate}
            onChange={(e) => setInstallmentDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Academic year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2025-2026"
            fullWidth
          />
        </FormSection>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      </FormPageShell>
    </Box>
  );
}
