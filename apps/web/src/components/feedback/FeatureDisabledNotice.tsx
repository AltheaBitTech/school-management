'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function FeatureDisabledNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Box sx={{ maxWidth: 720 }}>
      <Alert severity="info">
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2">{description}</Typography>
      </Alert>
    </Box>
  );
}
