import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Box component="main" sx={{ py: 8 }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Typography variant="h3" component="h1">
            CampusOps
          </Typography>
          <Typography variant="h6" color="text.secondary">
            School Operations Management Platform
          </Typography>
          <Typography color="text.secondary">
            Phase 3 staff and department management is available for authenticated school users.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button component={Link} href="/login" variant="contained">
              Sign in
            </Button>
            <Button component={Link} href="/staff" variant="outlined">
              Staff
            </Button>
            <Button component={Link} href="/departments" variant="outlined">
              Departments
            </Button>
            <Button component={Link} href="/attendance" variant="outlined">
              Attendance
            </Button>
            <Button component={Link} href="/leave" variant="outlined">
              Leave
            </Button>
            <Button component={Link} href="/session" variant="outlined">
              Verify session
            </Button>
            <Button component={Link} href="/organizations/new" variant="outlined">
              Create organization
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
