'use client';

import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { AppTable, EmptyState, LoadingState } from '@/components/ui/AppTable';
import { ListPageShell } from '@/components/ui/ListPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError, apiClient } from '@/lib/api/client';

interface SubscriptionRow {
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  planCode: string;
  planName: string;
  status: string;
  studentCount: number;
  staffCount: number;
  studentLimit: number;
  staffLimit: number;
}

export default function SubscriptionsPage() {
  const { showSuccess } = useAppSnackbar();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [selected, setSelected] = useState<SubscriptionRow | null>(null);
  const [planCode, setPlanCode] = useState('TRIAL');
  const [status, setStatus] = useState('TRIAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  function load(): void {
    setIsLoading(true);
    void apiClient
      .get<{ data: SubscriptionRow[] }>('/platform/subscriptions', { auth: true })
      .then((response) => setRows(response.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Could not load subscriptions');
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(): Promise<void> {
    if (!selected) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await apiClient.patch(
        `/platform/organizations/${selected.organizationId}/subscription`,
        { planCode, status },
        { auth: true },
      );
      showSuccess(`${selected.organizationName} is now on ${planCode}.`);
      setSelected(null);
      load();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Could not update the plan');
    } finally {
      setIsSaving(false);
    }
  }

  if (isForbidden) return <ForbiddenState />;

  return (
    <ListPageShell
      title="Subscriptions"
      description="Plans are records for each school. Changing a plan does not delete school data and does not collect payment."
      icon={ReceiptLongOutlined}
    >
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {isLoading ? <LoadingState label="Loading subscriptions" columnCount={5} /> : null}
      {!isLoading && rows.length === 0 ? (
        <EmptyState icon={ReceiptLongOutlined} message="No schools have a subscription yet." />
      ) : null}
      {!isLoading && rows.length > 0 ? (
        <AppTable minWidth={760} aria-label="Subscriptions">
          <TableHead>
            <TableRow>
              <TableCell>School</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Students</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell align="right">Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.organizationId} hover>
                <TableCell>
                  {row.organizationName}
                  <StatusChip status={row.status} />
                </TableCell>
                <TableCell>{row.planName}</TableCell>
                <TableCell>
                  {row.studentCount} / {row.studentLimit}
                </TableCell>
                <TableCell>
                  {row.staffCount} / {row.staffLimit}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={() => {
                      setSelected(row);
                      setPlanCode(row.planCode);
                      setStatus(row.status);
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AppTable>
      ) : null}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="xs">
        <DialogTitle>Change plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Plan" value={planCode} onChange={(event) => setPlanCode(event.target.value)} fullWidth>
              <MenuItem value="TRIAL">Trial</MenuItem>
              <MenuItem value="STANDARD">Standard</MenuItem>
            </TextField>
            <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)} fullWidth>
              <MenuItem value="TRIAL">Trial</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelected(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </ListPageShell>
  );
}
