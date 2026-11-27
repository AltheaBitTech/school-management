'use client';

import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import ClassOutlined from '@mui/icons-material/ClassOutlined';
import ApprovalOutlined from '@mui/icons-material/ApprovalOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import CelebrationOutlined from '@mui/icons-material/CelebrationOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DomainAddOutlined from '@mui/icons-material/DomainAddOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NotificationMenu } from '@/components/notifications/NotificationMenu';
import { ColorModeToggle } from '@/components/layout/ColorModeToggle';
import { brandVars } from '@/theme/theme';
import { useTerminology } from '@/lib/terminology/use-terminology';
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

const DRAWER_WIDTH = 272;

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
        href: '/classes',
        label: 'Classes & Sections',
        icon: ClassOutlined,
        requiredPermission: 'class.view',
      },
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
        label: 'Staff attendance',
        icon: FactCheckOutlined,
        requiredPermission: 'attendance.view',
      },
      {
        href: '/attendance/students',
        label: 'Student attendance',
        icon: GroupsOutlined,
        requiredPermission: 'student.attendance.view',
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
      { href: '/events?activity=1', label: 'Activities', icon: CelebrationOutlined, requiredPermission: 'event.view' },
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
        href: '/settings/profile',
        label: 'School profile',
        icon: AccountBalanceOutlined,
        requiredPermission: 'organization.settings.update',
      },
      {
        href: '/settings/logo',
        label: 'Logo',
        icon: ImageOutlined,
        requiredPermission: 'organization.settings.update',
      },
      {
        href: '/settings/documents',
        label: 'ID cards',
        icon: BadgeOutlined,
        requiredPermission: 'organization.settings.update',
      },
      {
        href: '/settings/roles',
        label: 'Roles & permissions',
        icon: AdminPanelSettingsOutlined,
        requiredPermission: 'role.view',
        match: 'prefix',
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
      label: 'Create institution',
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

  if (isAttendanceEnabled() && hasPermission(permissions, 'student.attendance.mark')) {
    items.push({
      href: '/attendance/students',
      label: 'Student attendance',
      icon: GroupsOutlined,
      requiredPermission: 'student.attendance.mark',
    });
  }

  if (hasPermission(permissions, 'complaint.view')) {
    items.push({ href: '/complaints', label: 'Complaints', icon: BuildOutlined, requiredPermission: 'complaint.view' });
  }
  if (hasPermission(permissions, 'notice.view')) {
    items.push({ href: '/notices', label: 'Notices', icon: AnnouncementOutlined, requiredPermission: 'notice.view' });
  }
  if (hasPermission(permissions, 'event.view')) {
    items.push({ href: '/events', label: 'Events', icon: CalendarMonthOutlined, requiredPermission: 'event.view' });
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

function buildOperationalNavGroups(
  permissions: string[] | undefined,
  terms: { unitPlural: string; groupPlural: string },
): NavGroup[] {
  const groups = NAV_GROUPS.map((group) => {
    if (group.title === 'People') {
      return {
        ...group,
        items: group.items.map((item) =>
          item.href === '/classes' ? { ...item, label: `${terms.unitPlural} & ${terms.groupPlural}` } : item,
        ),
      };
    }
    if (group.title !== 'Finance & records') {
      return group;
    }

    const items = [...group.items];
    if (hasAnyReportPermission(permissions)) {
      items.push(REPORTS_NAV_ITEM);
    }
    return { ...group, items };
  });

  return filterNavGroups(groups, permissions);
}

/**
 * Portal users (staff self-service, student, parent) get a fixed menu. Any extra feature an admin
 * grants to their role is appended as a "More" group so it is reachable, without duplicating
 * entries the portal menu already has.
 */
function withGrantedModules(portalGroups: NavGroup[], grantedOperationalGroups: NavGroup[]): NavGroup[] {
  const portalItems = portalGroups.flatMap((group) => group.items);
  const portalHrefs = new Set(portalItems.map((item) => item.href));
  // A permission the portal menu already surfaces (e.g. event.view → Events) doesn't add more entries.
  const portalPermissions = new Set(
    portalItems.flatMap((item) => item.requiredPermission ?? []),
  );
  const extraItems = grantedOperationalGroups
    .flatMap((group) => group.items)
    .filter((item) => {
      if (portalHrefs.has(item.href)) {
        return false;
      }
      const gates = item.requiredPermission ? [item.requiredPermission] : item.requiredAnyPermissions ?? [];
      return !gates.some((code) => portalPermissions.has(code));
    });

  if (extraItems.length === 0) {
    return portalGroups;
  }

  return [...portalGroups, { title: 'More', items: extraItems }];
}

function navItemButtonSx(isActive: boolean) {
  return {
    mx: 1.5,
    my: 0.25,
    py: 0.8,
    px: 1.5,
    borderRadius: '10px',
    color: 'sidebar.text',
    position: 'relative',
    '& .MuiListItemText-primary': {
      fontSize: '0.875rem',
      fontWeight: isActive ? 650 : 500,
    },
    transition: 'background-color 150ms ease, color 150ms ease',
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'sidebar.activeBorder',
      outlineOffset: 1,
    },
    '& .MuiListItemIcon-root': {
      color: 'sidebar.textMuted',
      minWidth: 34,
      transition: 'color 150ms ease',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: -12,
      top: '50%',
      width: 4,
      height: isActive ? 20 : 0,
      borderRadius: '0 4px 4px 0',
      bgcolor: 'sidebar.activeBorder',
      transform: 'translateY(-50%)',
      transition: 'height 200ms ease',
    },
    '&.Mui-selected': {
      bgcolor: 'sidebar.active',
      color: 'sidebar.activeText',
      '& .MuiListItemIcon-root': {
        color: 'sidebar.activeText',
      },
      '&:hover': {
        bgcolor: 'sidebar.active',
      },
    },
    '&:hover': {
      bgcolor: 'sidebar.hover',
      '& .MuiListItemIcon-root': {
        color: 'sidebar.activeText',
      },
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
  const terms = useTerminology();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const isStaffNav = isStaffSelfServiceUser(user?.permissions);
  const isStudentNav = isStudentSelfServiceUser(user?.permissions);
  const isParentNav = isParentSelfServiceUser(user?.permissions);
  const isPlatformOrg = isPlatformOrganization(user?.organization?.code);
  const isPublicMarketingHome = pathname === '/' && isReady && !isAuthenticated;
  const navGroups = useMemo(() => {
    const permissions = user?.permissions;
    const operationalGroups = buildOperationalNavGroups(permissions, {
      unitPlural: terms.unitPlural,
      groupPlural: terms.groupPlural,
    });

    if (isStaffNav) {
      return withGrantedModules([buildStaffSelfNavGroup(permissions)], operationalGroups);
    }

    if (isStudentNav) {
      return withGrantedModules(filterNavGroups([STUDENT_SELF_NAV_GROUP], permissions), operationalGroups);
    }

    if (isParentNav) {
      return withGrantedModules(filterNavGroups([PARENT_NAV_GROUP], permissions), operationalGroups);
    }

    if (isPlatformOrg) {
      return filterNavGroups([PLATFORM_NAV_GROUP], permissions);
    }

    return operationalGroups;
  }, [isStaffNav, isStudentNav, isParentNav, isPlatformOrg, user?.permissions, terms.unitPlural, terms.groupPlural]);
  const homeHref = isStaffNav
    ? '/staff/dashboard'
    : isStudentNav
      ? '/student/profile'
      : isParentNav
        ? '/parent'
        : '/';
  const homeLabel = isPlatformOrg
    ? 'Dashboard'
    : isStaffNav
    ? 'My dashboard'
    : isStudentNav
      ? 'My profile'
      : isParentNav
        ? 'My children'
        : 'Home';
  const HomeNavIcon = isStaffNav || isPlatformOrg ? DashboardOutlined : isStudentNav ? PersonOutlined : HomeOutlined;
  const appBarTitle = isPlatformOrg
    ? 'CampusOps platform'
    : isStaffNav
      ? 'Staff self-service'
      : isStudentNav
        ? 'Student portal'
        : 'Operations';

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
      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: '14px',
            border: 1,
            borderColor: 'sidebar.border',
            bgcolor: 'sidebar.hover',
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1, minWidth: 0 }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                background: brandVars.gradient,
                color: 'common.white',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {getUserInitials(name)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontWeight: 650 }}>
                {name}
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: 'sidebar.textMuted', display: 'block' }}>
                {role}
              </Typography>
            </Box>
          </Stack>
          <Button
            onClick={() => void handleSignOut()}
            size="small"
            fullWidth
            startIcon={<LogoutOutlined fontSize="small" />}
            sx={{
              color: 'sidebar.textMuted',
              justifyContent: 'flex-start',
              px: 1,
              '&:hover': { bgcolor: 'sidebar.hover', color: 'error.main' },
            }}
          >
            Sign out
          </Button>
        </Box>
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
        borderRight: 1,
        borderColor: 'sidebar.border',
      }}
    >
      <Toolbar sx={{ px: 2.5, gap: 1.25 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: brandVars.gradient,
            boxShadow: '0 6px 16px -6px rgba(79, 70, 229, 0.6)',
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
          sx={{ color: 'text.primary', textDecoration: 'none', fontWeight: 750, letterSpacing: '-0.03em' }}
        >
          CampusOps
        </Typography>
      </Toolbar>
      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', py: 1, flex: 1 }}>
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
          <Box key={group.title} sx={{ mt: 2 }}>
            <Typography
              variant="overline"
              sx={{
                px: 3.25,
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
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  background: brandVars.gradient,
                  color: 'common.white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SchoolOutlined sx={{ fontSize: 18 }} />
              </Box>
              <Typography
                variant="h6"
                component={Link}
                href="/"
                sx={{ color: 'text.primary', textDecoration: 'none', fontWeight: 700 }}
              >
                CampusOps
              </Typography>
            </Stack>
            <ColorModeToggle />
            <Button
              component={Link}
              href="/register-organization"
              size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Register Your Institution
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
        <Toolbar sx={{ gap: { xs: 0.5, sm: 1 }, px: { xs: 1.5, sm: 3, lg: 4 } }}>
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
            sx={{ flexGrow: 1, color: 'text.secondary', letterSpacing: '0.08em', minWidth: 0 }}
          >
            {appBarTitle}
          </Typography>
          <ColorModeToggle />
          <NotificationMenu />
          {isReady && isAuthenticated && user ? (
            <>
              <Button
                onClick={(event) => setAccountAnchor(event.currentTarget)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={accountAnchor ? 'true' : undefined}
                sx={{
                  ml: 0.5,
                  px: { xs: 0.5, sm: 1 },
                  py: 0.5,
                  minWidth: 0,
                  gap: 1.25,
                  color: 'text.primary',
                  borderRadius: 999,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background: brandVars.gradient,
                    color: 'common.white',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {getUserInitials(displayName)}
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, maxWidth: 200, textAlign: 'left' }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 650, lineHeight: 1.3 }}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ lineHeight: 1.3 }}>
                    {roleLabel}
                    {!isPlatformOrg && user?.organization?.code ? ` · ${user.organization.code}` : ''}
                  </Typography>
                </Box>
              </Button>
              <Menu
                anchorEl={accountAnchor}
                open={Boolean(accountAnchor)}
                onClose={() => setAccountAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
              >
                <Box sx={{ px: 2, py: 1.25 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 650 }}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="p">
                    {roleLabel}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setAccountAnchor(null);
                    void handleSignOut();
                  }}
                  sx={{ mt: 0.5, color: 'error.main' }}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}>
                    <LogoutOutlined fontSize="small" />
                  </ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
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
              width: `min(85vw, ${DRAWER_WIDTH + 24}px)`,
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
            px: { xs: 2, sm: 3, lg: 5 },
            py: { xs: 2.5, sm: 4 },
            pb: { xs: 6, sm: 6 },
            maxWidth: 1320,
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
