import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

interface ForbiddenStateProps {
  title?: string;
  message?: string;
}

export function ForbiddenState({
  title = 'Access denied',
  message = 'You do not have permission to view this page.',
}: ForbiddenStateProps) {
  return (
    <Box sx={{ py: 2 }}>
      <Alert severity="warning">
        <strong>{title}</strong>
        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
          {message}
        </Box>
      </Alert>
    </Box>
  );
}
