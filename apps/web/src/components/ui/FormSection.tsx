'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  maxWidth?: number | string;
}

export function FormSection({
  children,
  title,
  description,
  maxWidth = 560,
}: FormSectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, maxWidth, width: '100%' }}>
      <Stack spacing={2.25}>
        {title ? (
          <Box sx={{ pb: 1.75, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontSize: '1.0625rem', letterSpacing: '-0.01em' }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
        ) : null}
        {children}
      </Stack>
    </Paper>
  );
}

interface FormActionsProps {
  children: React.ReactNode;
}

export function FormActions({ children }: FormActionsProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      flexWrap="wrap"
      useFlexGap
      sx={{ pt: 0.5, justifyContent: 'flex-end', width: '100%' }}
    >
      {children}
    </Stack>
  );
}

interface FormPageFooterProps {
  cancelHref: string;
  cancelLabel?: string;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
}

export function FormPageFooter({
  cancelHref,
  cancelLabel = 'Cancel',
  submitLabel,
  submittingLabel,
  isSubmitting = false,
  submitDisabled = false,
}: FormPageFooterProps) {
  const busyLabel = submittingLabel ?? `${submitLabel.replace(/\.\.\.$/, '')}…`;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      justifyContent="space-between"
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ width: '100%' }}
    >
      {isSubmitting ? (
        <Button variant="text" disabled>
          {cancelLabel}
        </Button>
      ) : (
        <Button component={Link} href={cancelHref} variant="text">
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" variant="contained" disabled={isSubmitting || submitDisabled}>
        {isSubmitting ? (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
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
