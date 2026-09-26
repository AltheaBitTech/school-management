'use client';

import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { NotificationMenu } from '@/components/notifications/NotificationMenu';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { isStaffSelfServiceUser } from '@/lib/auth/routing';

const DRAWER_WIDTH = 268;

interface NavItem {
  href: string;
  label: string;
  match?: 'exact' | 'prefix';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const PLATFORM_ORGANIZATION_CODE = 'campusops-platform';

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'People',
    items: [
      { href: '/staff', label: 'Staff' },
      { href: '/students', label: 'Students' },
      { href: '/departments', label: 'Departments' },
      { href: '/attendance', label: 'Attendance' },
    ],
  },
  {
    title: 'Workflows',
    items: [
      { href: '/leave', label: 'Leave' },
      { href: '/approvals', label: 'Approvals' },
      { href: '/complaints', label: 'Complaints' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { href: '/visitors', label: 'Visitors' },
      { href: '/notices', label: 'Notices' },
      { href: '/events', label: 'Events' },
      { href: '/assets', label: 'Assets' },
    ],
  },
  {
    title: 'Finance & records',
    items: [
      { href: '/fees', label: 'Fees' },
      { href: '/documents', label: 'Documents' },
      { href: '/reports/events', label: 'Event reports' },
      { href: '/reports/attendance', label: 'Attendance reports' },
      { href: '/reports/leave', label: 'Leave reports' },
      { href: '/reports/fees', label: 'Fees reports' },
      { href: '/reports/complaints', label: 'Complaints reports' },
      { href: '/reports/visitors', label: 'Visitor reports' },
    ],
  },
];

const PLATFORM_NAV_GROUP: NavGroup = {
  title: 'Platform',
  items: [{ href: '/admin/registrations', label: 'Registration requests' }],
};

const STAFF_SELF_NAV_GROUP: NavGroup = {
  title: 'My workspace',
  items: [
    { href: '/staff/dashboard', label: 'My dashboard', match: 'exact' },
    { href: '/staff/attendance', label: 'My attendance' },
    { href: '/staff/leave', label: 'My leave' },
  ],
};

function MenuIcon(): React.ReactNode {
  return (
    <SvgIcon>
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </SvgIcon>
  );
}

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.match === 'exact' || item.href === '/') {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, isAuthenticated, user, signOut } = useAuthSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isStaffNav = isStaffSelfServiceUser(user?.permissions);
  const navGroups = isStaffNav
    ? [STAFF_SELF_NAV_GROUP]
    : user?.organization?.code === PLATFORM_ORGANIZATION_CODE
      ? [PLATFORM_NAV_GROUP, ...NAV_GROUPS]
      : NAV_GROUPS;
  const homeHref = isStaffNav ? '/staff/dashboard' : '/';
  const homeLabel = isStaffNav ? 'My dashboard' : 'Dashboard';
  const appBarTitle = isStaffNav ? 'Staff self-service' : 'School operations';

  function handleNavClick(): void {
    setMobileOpen(false);
  }

  async function handleSignOut(): Promise<void> {
    await signOut();
    router.push('/login');
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Typography
          variant="h6"
          component={Link}
          href={homeHref}
          onClick={handleNavClick}
          sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
        >
          CampusOps
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflowY: 'auto', py: 1.5, flex: 1 }}>
        {!isStaffNav ? (
          <List disablePadding>
            <ListItemButton
              component={Link}
              href={homeHref}
              selected={pathname === homeHref}
              onClick={handleNavClick}
              sx={{ mx: 1, borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SvgIcon fontSize="small">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </SvgIcon>
              </ListItemIcon>
              <ListItemText primary={homeLabel} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </List>
        ) : null}
        {navGroups.map((group) => (
          <Box key={group.title} sx={{ mt: 1.5 }}>
            <Typography
              variant="overline"
              sx={{ px: 3, color: 'text.secondary', letterSpacing: '0.08em' }}
            >
              {group.title}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={isNavItemActive(pathname, item)}
                  onClick={handleNavClick}
                  sx={{ mx: 1, borderRadius: 1 }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop ? (
            <IconButton
              color="inherit"
              aria-label="Open navigation"
              edge="start"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography variant="subtitle1" noWrap sx={{ flexGrow: 1 }}>
            {appBarTitle}
          </Typography>
          <NotificationMenu />
          {isReady && isAuthenticated && user ? (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ ml: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {user.email.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, maxWidth: 220 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {user.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.organization?.name ?? 'CampusOps'}
                </Typography>
              </Box>
              <Button onClick={() => void handleSignOut()} size="small">
                Sign out
              </Button>
            </Stack>
          ) : null}
          {isReady && !isAuthenticated ? (
            <Button component={Link} href="/login" variant="contained" size="small">
              Sign in
            </Button>
          ) : null}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
        }}
      >
        <Toolbar />
        <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2.5, sm: 3.5 }, maxWidth: 1280, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
