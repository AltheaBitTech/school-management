'use client';

import QrCodeScannerOutlined from '@mui/icons-material/QrCodeScannerOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FormEvent, useState } from 'react';
import { AttendanceFeatureGate } from '@/components/features/AttendanceFeatureGate';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { ApiError, apiClient } from '@/lib/api/client';

interface ScanResult {
  staffName: string;
  employeeCode: string;
  action: 'CHECK_IN' | 'CHECK_OUT';
  checkInAt: string | null;
  checkOutAt: string | null;
}

function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function ScanAttendancePageContent() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(code: string): Promise<void> {
    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMessage('Enter the employee code printed on the staff ID.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.post<{ data: ScanResult }>(
        '/attendance/scan',
        { employeeCode: trimmed },
        { auth: true },
      );
      setResult(response.data);
      setEmployeeCode('');
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(error instanceof ApiError ? error.message : 'Could not mark attendance');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await submit(employeeCode);
  }

  if (isForbidden) return <ForbiddenState />;

  return (
    <FormPageShell
      title="Scan attendance"
      description="Check a staff member in or out for today. The first mark is check-in. The next is check-out."
      icon={QrCodeScannerOutlined}
    >
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2} component="form" onSubmit={handleSubmit}>
          <TextField
            label="Employee code"
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            required
            autoFocus
            helperText="Type the code, or use a scanner that types it and presses Enter."
            fullWidth
          />
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <Button type="submit" variant="contained" disabled={isSubmitting || !employeeCode.trim()}>
            {isSubmitting ? 'Saving…' : 'Mark attendance'}
          </Button>
        </Stack>
      </Paper>

      {result ? (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">{result.staffName}</Typography>
              <StatusChip
                status={result.action === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT'}
                label={result.action === 'CHECK_IN' ? 'Checked in' : 'Checked out'}
              />
            </Stack>
            <Typography color="text.secondary">{result.employeeCode}</Typography>
            <Typography variant="body2">In {formatTime(result.checkInAt)} · Out {formatTime(result.checkOutAt)}</Typography>
          </Stack>
        </Paper>
      ) : null}
    </FormPageShell>
  );
}

export default function ScanAttendancePage() {
  return (
    <AttendanceFeatureGate>
      <ScanAttendancePageContent />
    </AttendanceFeatureGate>
  );
}
