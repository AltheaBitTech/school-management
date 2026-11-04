'use client';

import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

interface SubmitButtonProps extends Omit<ButtonProps, 'type'> {
  isSubmitting?: boolean;
  submittingLabel?: string;
}

export function SubmitButton({
  isSubmitting = false,
  submittingLabel,
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  const textLabel = typeof children === 'string' ? children : 'Save';
  const busyLabel = submittingLabel ?? `${textLabel.replace(/\.\.\.$/, '')}…`;

  return (
    <Button type="submit" variant="contained" disabled={isSubmitting || disabled} {...props}>
      {isSubmitting ? (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} color="inherit" aria-hidden />
          {busyLabel}
        </Box>
      ) : (
        children
      )}
    </Button>
  );
}
