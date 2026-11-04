'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

interface FormActionsProps {
  submitLabel: string;
  submittingLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
}

export function FormActions({
  submitLabel,
  submittingLabel,
  onCancel,
  cancelLabel = 'Back',
  isSubmitting = false,
  submitDisabled = false,
}: FormActionsProps) {
  const busyLabel = submittingLabel ?? `${submitLabel.replace(/\.\.\.$/, '')}…`;

  return (
    <Stack direction="row" spacing={1.5} justifyContent="flex-end" flexWrap="wrap">
      {onCancel ? (
        <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
      ) : null}
      <Button type="submit" variant="contained" disabled={isSubmitting || submitDisabled}>
        {isSubmitting ? (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} color="inherit" aria-hidden />
            {busyLabel}
          </Box>
        ) : (
          submitLabel
        )}
      </Button>
    </Stack>
  );
}
