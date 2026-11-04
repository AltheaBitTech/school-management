'use client';

import ApprovalOutlined from '@mui/icons-material/ApprovalOutlined';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FormEvent, useEffect, useState } from 'react';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError, apiClient } from '@/lib/api/client';
import { optionalPositiveAmount, requiredText } from '@/lib/forms/field-rules';

type RequestType = 'MAINTENANCE' | 'PURCHASE' | 'BUDGET';

interface OperationalRequest {
  id: string;
  requestType: RequestType;
  title: string;
  status: string;
  amount: number | null;
}

export default function OperationalRequestsPage() {
  const { showSuccess } = useAppSnackbar();
  const [requests, setRequests] = useState<OperationalRequest[]>([]);
  const [requestType, setRequestType] = useState<RequestType>('MAINTENANCE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load(): Promise<void> {
    const response = await apiClient.get<{ data: OperationalRequest[] }>('/operational-requests', {
      auth: true,
    });
    setRequests(response.data);
  }

  useEffect(() => {
    void load().catch((error) =>
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load requests'),
    );
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const nextTitleError = requiredText(title, 'Title', 3);
    const nextDescriptionError = requiredText(description, 'Description', 3);
    const nextAmountError = optionalPositiveAmount(amount);
    setTitleError(nextTitleError);
    setDescriptionError(nextDescriptionError);
    setAmountError(nextAmountError);
    if (nextTitleError || nextDescriptionError || nextAmountError) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.post(
        '/operational-requests',
        {
          requestType,
          title: title.trim(),
          description: description.trim(),
          amount: amount.trim() ? Number(amount) : undefined,
        },
        { auth: true },
      );
      setTitle('');
      setDescription('');
      setAmount('');
      showSuccess('Request submitted for approval');
      await load();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormPageShell
      title="Operational requests"
      description="Submit maintenance, purchase, or budget work. School admins approve it from Approvals."
      icon={ApprovalOutlined}
      maxWidth={880}
    >
      <form onSubmit={(event) => void handleSubmit(event)}>
        <FormSection title="New request" description="A short title and what you need approved." maxWidth={880}>
          <TextField
            select
            label="Type"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value as RequestType)}
          >
            <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            <MenuItem value="PURCHASE">Purchase</MenuItem>
            <MenuItem value="BUDGET">Budget</MenuItem>
          </TextField>
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => setTitleError(requiredText(title, 'Title', 3))}
            error={Boolean(titleError)}
            helperText={titleError ?? 'At least 3 characters'}
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => setDescriptionError(requiredText(description, 'Description', 3))}
            error={Boolean(descriptionError)}
            helperText={descriptionError ?? 'What should be approved'}
            multiline
            minRows={3}
            required
          />
          <TextField
            label="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onBlur={() => setAmountError(optionalPositiveAmount(amount))}
            error={Boolean(amountError)}
            helperText={amountError ?? 'Optional'}
            type="number"
          />
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <FormPageFooter
            cancelHref="/approvals"
            submitLabel="Submit for approval"
            submittingLabel="Submitting…"
            isSubmitting={isSubmitting}
          />
        </FormSection>
      </form>

      <FormSection title="Recent requests" description="Newest first." maxWidth={880}>
        {requests.length === 0 ? (
          <Typography color="text.secondary">No requests yet.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {requests.map((request) => (
              <Card key={request.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Stack>
                      <Typography fontWeight={600}>{request.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {request.requestType}
                        {request.amount != null ? ` · ${request.amount}` : ''}
                      </Typography>
                    </Stack>
                    <StatusChip status={request.status} label={request.status.replaceAll('_', ' ')} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </FormSection>
    </FormPageShell>
  );
}
