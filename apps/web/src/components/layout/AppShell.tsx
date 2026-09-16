import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component={Link} href="/" sx={{ color: 'inherit', textDecoration: 'none', mr: 3 }}>
            CampusOps
          </Typography>
          <Button component={Link} href="/staff" color="inherit">
            Staff
          </Button>
          <Button component={Link} href="/departments" color="inherit">
            Departments
          </Button>
          <Button component={Link} href="/attendance" color="inherit">
            Attendance
          </Button>
          <Button component={Link} href="/leave" color="inherit">
            Leave
          </Button>
          <Button component={Link} href="/complaints" color="inherit">
            Complaints
          </Button>
          <Button component={Link} href="/notices" color="inherit">
            Notices
          </Button>
          <Button component={Link} href="/visitors" color="inherit">
            Visitors
          </Button>
          <Button component={Link} href="/assets" color="inherit">
            Assets
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button component={Link} href="/login" variant="outlined" size="small">
            Sign in
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
