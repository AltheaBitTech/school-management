'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { CreateSchoolWizard } from '@/components/platform/CreateSchoolWizard';

export default function CreateOrganizationPage() {
  return (
    <Box component="main" sx={{ py: 8 }}>
      <Container maxWidth="md">
        <CreateSchoolWizard />
      </Container>
    </Box>
  );
}

