'use client';

import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import ApprovalOutlined from '@mui/icons-material/ApprovalOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DomainAddOutlined from '@mui/icons-material/DomainAddOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import InventoryOutlined from '@mui/icons-material/InventoryOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import ManageSearchOutlined from '@mui/icons-material/ManageSearchOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import QrCodeScannerOutlined from '@mui/icons-material/QrCodeScannerOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import TimelapseOutlined from '@mui/icons-material/TimelapseOutlined';
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
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NotificationMenu } from '@/components/notifications/NotificationMenu';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import type { AuthUser } from '@/lib/auth/auth-client';
import {
  hasPermission,
  isParentSelfServiceUser,
  isStaffSelfServiceUser,
  isStudentSelfServiceUser,
} from '@/lib/auth/routing';
import { getUserDisplayName, getUserInitials, getUserRoleLabel } from '@/lib/auth/user-display';
import { isPlatformOrganization } from '@/lib/navigation/platform';
import { isAttendanceEnabled } from '@/lib/features/feature-flags';
import { hasAnyReportPermission } from '@/lib/reports/reports-catalog';

const DRAWER_WIDTH = 268;

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  match?: 'exact' | 'prefix';
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'People',
    items: [
      { href: '/staff', label: 'Staff', icon: PeopleAltOutlined, requiredPermission: 'staff.view' },
      { href: '/students', label: 'Students', icon: SchoolOutlined, requiredPermission: 'student.view' },
      {
        href: '/departments',
        label: 'Departments',
        icon: AccountTreeOutlined,
        requiredPermission: 'department.view',
      },
    ],
  },
  {
    title: 'Workflows',
    items: [
      { href: '/leave', label: 'Leave', icon: EventAvailableOutlined, requiredPermission: 'leave.view' },
      {
        href: '/attendance',
        label: 'Attendance',
        icon: FactCheckOutlined,
        requiredPermission: 'attendance.view',
      },
      {
        href: '/attendance/scan',
        label: 'Scan attendance',
        icon: QrCodeScannerOutlined,
        requiredPermission: 'attendance.mark',
      },
      {
        href: '/calendar',
        label: 'Calendar',
        icon: CalendarMonthOutlined,
        requiredAnyPermissions: [
          'dashboard.view',
          'leave.view',
          'staff.self.leave.view',
          'event.view',
        ],
      },
      { href: '/approvals', label: 'Approvals', icon: ApprovalOutlined, requiredPermission: 'approval.view' },
      {
        href: '/approvals/requests',
        label: 'Requests',
        icon: ApprovalOutlined,
        requiredPermission: 'approval.submit',
      },
      { href: '/complaints', label: 'Complaints', icon: BuildOutlined, requiredPermission: 'complaint.view' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { href: '/visitors', label: 'Visitors', icon: BadgeOutlined, requiredPermission: 'visitor.view' },
      { href: '/notices', label: 'Notices', icon: AnnouncementOutlined, requiredPermission: 'notice.view' },
      { href: '/events', label: 'Events', icon: CalendarMonthOutlined, requiredPermission: 'event.view' },
      { href: '/assets', label: 'Assets', icon: InventoryOutlined, requiredPermission: 'asset.view' },
      { href: '/transport', label: 'Transport', icon: DirectionsBusOutlined, requiredPermission: 'transport.view' },
    ],
  },
  {
    title: 'Finance & records',
    items: [
      { href: '/fees', label: 'Fees', icon: ReceiptLongOutlined, requiredPermission: 'fee.view' },
      { href: '/documents', label: 'Documents', icon: DescriptionOutlined, requiredPermission: 'document.view' },
      { href: '/audit', label: 'Audit log', icon: ManageSearchOutlined, requiredPermission: 'audit.view' },
      {
        href: '/settings/logo',
        label: 'School logo',
        icon: ImageOutlined,
        requiredPermission: 'organization.settings.update',
      },
      {
        href: '/settings/documents',
        label: 'ID cards',
        icon: BadgeOutlined,
        requiredPermission: 'organization.settings.update',
      },
    ],
  },
];

const REPORTS_NAV_ITEM: NavItem = {
  href: '/reports',
  label: 'Reports',
  icon: BarChartOutlined,
  match: 'prefix',
};

const PLATFORM_NAV_GROUP: NavGroup = {
  title: 'Platform',
  items: [
    {
      href: '/organizations/new',
      label: 'Create school',
      icon: DomainAddOutlined,
      requiredPermission: 'platform.organization.create',
    },
    {
      href: '/admin/registrations',
      label: 'Registration requests',
      icon: HowToRegOutlined,
      requiredPermission: 'platform.organization.registration.approve',
    },
    {
      href: '/admin/subscriptions',
      label: 'Subscriptions',
      icon: ReceiptLongOutlined,
      requiredPermission: 'platform.subscription.manage',
    },
  ],
};

function buildStaffSelfNavGroup(permissions: string[] | undefined): NavGroup {
  const items: NavItem[] = [
    { href: '/staff/dashboard', label: 'My dashboard', icon: DashboardOutlined, match: 'exact' },
    { href: '/staff/attendance', label: 'My attendance', icon: CheckCircleOutlined },
    { href: '/staff/leave', label: 'My leave', icon: TimelapseOutlined },
  ];

  if (hasPermission(permissions, 'complaint.view')) {
    items.push({ href: '/complaints', label: 'Complaints', icon: BuildOutlined });
  }
  if (hasPermission(permissions, 'notice.view')) {
    items.push({ href: '/notices', label: 'Notices', icon: AnnouncementOutlined });
  }
  if (hasPermission(permissions, 'event.view')) {
    items.push({ href: '/events', label: 'Events', icon: CalendarMonthOutlined });
  }
  if (
    hasPermission(permissions, 'staff.self.leave.view') ||
    hasPermission(permissions, 'event.view')
  ) {
    items.push({ href: '/calendar', label: 'Calendar', icon: CalendarMonthOutlined });
  }

  return { title: 'My workspace', items };
}

const PARENT_NAV_GROUP: NavGroup = {
  title: 'Parent',
  items: [
    { href: '/parent', label: 'My children', icon: SchoolOutlined, requiredPermission: 'parent.portal.view' },
    { href: '/notices', label: 'Notices', icon: AnnouncementOutlined, requiredPermission: 'notice.view' },
  ],
};

const STUDENT_SELF_NAV_GROUP: NavGroup = {
  title: 'My Portal',
  items: [
    {
      href: '/student/profile',
      label: 'My Profile',
      icon: PersonOutlined,
      requiredPermission: 'student.self.view',
    },
    {
      href: '/student/fees',
      label: 'My Fees',
      icon: ReceiptLongOutlined,
      requiredPermission: 'student.self.fee.view',
    },
    {
      href: '/notices',
      label: 'Notices',
      icon: AnnouncementOutlined,
      requiredPermission: 'notice.view',
    },
    {
      href: '/events',
      label: 'Events',
      icon: CalendarMonthOutlined,
      requiredPermission: 'event.view',
    },
  ],
};

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.match === 'exact' || item.href === '/') {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isAttendanceNavHref(href: string): boolean {
  return href === '/attendance' || href.startsWith('/attendance/') || href === '/staff/attendance';
}

function isNavItemVisible(item: NavItem, permissions: string[] | undefined): boolean {
  if (!isAttendanceEnabled() && isAttendanceNavHref(item.href)) {
    return false;
  }

  if (item.requiredAnyPermissions?.length) {
    return item.requiredAnyPermissions.some((code) => hasPermission(permissions, code));
  }
  if (!item.requiredPermission) {
    return true;
  }
  if (item.href === '/reports') {
    return hasAnyReportPermission(permissions);
  }
  return hasPermission(permissions, item.requiredPermission);
}

function filterNavGroups(groups: NavGroup[], permissions: string[] | undefined): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavItemVisible(item, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

function navItemButtonSx(isActive: boolean) {
  return {
    mx: 1.25,
    my: 0.25,
    py: 0.85,
    borderRadius: 2,
    color: 'sidebar.text',
    px: 1.5,
    position: 'relative',
    borderLeft: '3px solid',
    borderLeftColor: isActive ? 'sidebar.activeBorder' : 'transparent',
    '& .MuiListItemText-primary': {
      fontSize: '0.875rem',
      fontWeight: isActive ? 650 : 500,
    },
    transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'sidebar.activeBorder',
      outlineOffset: 2,
    },
    '& .MuiListItemIcon-root': {
      color: 'sidebar.textMuted',
      minWidth: 36,
    },
    '&.Mui-selected': {
      bgcolor: 'sidebar.active',
      color: 'common.white',
      '& .MuiListItemIcon-root': {
        color: 'common.white',
      },
      '&:hover': {
        bgcolor: 'sidebar.active',
      },
    },
    '&:hover': {
      bgcolor: 'sidebar.hover',
      color: 'common.white',
    },
  };
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
  const isStudentNav = isStudentSelfServiceUser(user?.permissions);
  const isParentNav = isParentSelfServiceUser(user?.permissions);
  const isPlatformOrg = isPlatformOrganization(user?.organization?.code);
  const isPublicMarketingHome = pathname === '/' && isReady && !isAuthenticated;
  const navGroups = useMemo(() => {
    if (isStaffNav) {
      return [buildStaffSelfNavGroup(user?.permissions)];
    }

    if (isStudentNav) {
      return filterNavGroups([STUDENT_SELF_NAV_GROUP], user?.permissions);
    }

    if (isParentNav) {
      return filterNavGroups([PARENT_NAV_GROUP], user?.permissions);
    }

    if (isPlatformOrg) {
      return filterNavGroups([PLATFORM_NAV_GROUP], user?.permissions);
    }

    const groups = NAV_GROUPS.map((group) => {
      if (group.title !== 'Finance & records') {
        return group;
      }

      const items = [...group.items];
      if (hasAnyReportPermission(user?.permissions)) {
        items.push(REPORTS_NAV_ITEM);
      }
      return { ...group, items };
    });

    return filterNavGroups(groups, user?.permissions);
  }, [isStaffNav, isStudentNav, isParentNav, isPlatformOrg, user?.permissions]);
  const homeHref = isStaffNav
    ? '/staff/dashboard'
    : isStudentNav
      ? '/student/profile'
      : isParentNav
        ? '/parent'
        : '/';
  const homeLabel = isStaffNav
    ? 'My dashboard'
    : isStudentNav
      ? 'My profile'
      : isParentNav
        ? 'My children'
        : 'Home';
  const HomeNavIcon = isStaffNav ? DashboardOutlined : isStudentNav ? PersonOutlined : HomeOutlined;
  const appBarTitle = isPlatformOrg
    ? 'CampusOps platform'
    : isStaffNav
      ? 'Staff self-service'
      : isStudentNav
        ? 'Student portal'
        : 'School operations';

  const displayName = user ? getUserDisplayName(user) : '';
  const roleLabel = user ? getUserRoleLabel(user) : '';

  function handleNavClick(): void {
    setMobileOpen(false);
  }

  async function handleSignOut(): Promise<void> {
    await signOut();
    router.push('/login');
  }

  function renderSidebarUser(userContext: AuthUser): React.ReactNode {
    const name = getUserDisplayName(userContext);
    const role = getUserRoleLabel(userContext);

    return (
      <Box sx={{ px: 2, py: 2, borderTop: 1, borderColor: 'sidebar.active' }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1, minWidth: 0 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
            {getUserInitials(name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: 'common.white', fontWeight: 600 }}>
              {name}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'sidebar.textMuted', display: 'block' }}>
              Signed in as {role}
            </Typography>
          </Box>
        </Stack>
        <Button
          onClick={() => void handleSignOut()}
          size="small"
          startIcon={<LogoutOutlined fontSize="small" />}
          sx={{
            color: 'sidebar.text',
            justifyContent: 'flex-start',
            px: 0,
            minWidth: 0,
            '&:hover': { bgcolor: 'transparent', color: 'common.white' },
          }}
        >
          Sign out
        </Button>
      </Box>
    );
  }

  const drawer = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'sidebar.main',
        color: 'sidebar.text',
      }}
    >
      <Toolbar sx={{ px: 2.5, gap: 1.25 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SchoolOutlined fontSize="small" />
        </Box>
        <Typography
          variant="h6"
          component={Link}
          href={homeHref}
          onClick={handleNavClick}
          sx={{ color: 'common.white', textDecoration: 'none', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          CampusOps
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'sidebar.active' }} />
      <Box sx={{ overflowY: 'auto', py: 1.5, flex: 1 }}>
        <List disablePadding>
          <ListItemButton
            component={Link}
            href={homeHref}
            selected={pathname === homeHref}
            onClick={handleNavClick}
            sx={navItemButtonSx(pathname === homeHref)}
          >
            <ListItemIcon>
              <HomeNavIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={homeLabel} primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        </List>
        {navGroups.map((group) => (
          <Box key={group.title} sx={{ mt: 1.5 }}>
            <Typography
              variant="overline"
              sx={{
                px: 3,
                pb: 0.25,
                color: 'sidebar.textSection',
                letterSpacing: '0.1em',
                fontSize: '0.6875rem',
                display: 'block',
              }}
            >
              {group.title}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive = isNavItemActive(pathname, item);
                return (
                  <ListItemButton
                    key={item.href}
                    component={Link}
                    href={item.href}
                    selected={isActive}
                    onClick={handleNavClick}
                    sx={navItemButtonSx(isActive)}
                  >
                    <ListItemIcon>
                      <ItemIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
      {isReady && isAuthenticated && user ? renderSidebarUser(user) : null}
    </Box>
  );

  if (isPublicMarketingHome) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="sticky" color="inherit" elevation={0}>
          <Toolbar sx={{ gap: 1, maxWidth: 1280, mx: 'auto', width: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
              <SchoolOutlined color="primary" />
              <Typography
                variant="h6"
                component={Link}
                href="/"
                sx={{ color: 'text.primary', textDecoration: 'none', fontWeight: 700 }}
              >
                CampusOps
              </Typography>
            </Stack>
            <Button component={Link} href="/register-organization" size="small">
              Register Your School
            </Button>
            <Button component={Link} href="/login" variant="contained" size="small">
              Sign in
            </Button>
          </Toolbar>
        </AppBar>
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ gap: 1, px: { xs: 2, sm: 3, lg: 4 } }}>
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
          <Typography
            variant="overline"
            noWrap
            sx={{ flexGrow: 1, color: 'text.secondary', letterSpacing: '0.08em' }}
          >
            {appBarTitle}
          </Typography>
          <NotificationMenu />
          {isReady && isAuthenticated && user ? (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ ml: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
                {getUserInitials(displayName)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, maxWidth: 220 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {roleLabel}
                  {!isPlatformOrg && user?.organization?.code
                    ? ` · ${user.organization.code}`
                    : ''}
                </Typography>
              </Box>
              <Tooltip title="Sign out">
                <IconButton aria-label="Sign out" onClick={() => void handleSignOut()} size="small">
                  <LogoutOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
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
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: 'none',
            },
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
        <Box
          sx={{
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 2.5, sm: 4 },
            maxWidth: isStudentNav ? 720 : 1280,
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
