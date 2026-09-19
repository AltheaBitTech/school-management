'use client';

import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/auth/session';
import {
  countUnreadNotifications,
  formatNotificationCreatedAt,
  formatUnreadBadgeCount,
  listNotifications,
  markNotificationRead,
  type Notification,
} from '@/lib/notifications/notifications-client';

const NOTIFICATION_PAGE_SIZE = 10;

function NotificationsBellIcon(): React.ReactNode {
  return (
    <SvgIcon aria-hidden="true">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </SvgIcon>
  );
}

export function NotificationMenu(): React.ReactElement | null {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markReadError, setMarkReadError] = useState<string | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  const isOpen = Boolean(anchorEl);
  const unreadCount = countUnreadNotifications(notifications);

  const loadNotifications = useCallback(async (): Promise<void> => {
    if (!getAccessToken()) {
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await listNotifications({ page: 1, pageSize: NOTIFICATION_PAGE_SIZE });
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setNotifications(response.data);
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load notifications',
      );
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setIsAuthenticated(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadNotifications();
  }, [isAuthenticated, loadNotifications]);

  function handleOpen(event: React.MouseEvent<HTMLElement>): void {
    setAnchorEl(event.currentTarget);
    setMarkReadError(null);
    void loadNotifications();
  }

  function handleClose(): void {
    setAnchorEl(null);
    setMarkReadError(null);
  }

  async function handleNotificationClick(notification: Notification): Promise<void> {
    if (notification.readAt || actingOnId) {
      return;
    }

    setMarkReadError(null);
    setActingOnId(notification.id);

    try {
      const updated = await markNotificationRead(notification.id);
      loadRequestIdRef.current += 1;
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      setMarkReadError(
        error instanceof Error ? error.message : 'Failed to mark notification as read',
      );
    } finally {
      setActingOnId(null);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <IconButton
        aria-label="Notifications"
        aria-controls={isOpen ? 'notification-menu-popover' : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen ? 'true' : undefined}
        onClick={handleOpen}
        color="inherit"
        size="large"
      >
        <Badge
          badgeContent={unreadCount > 0 ? formatUnreadBadgeCount(unreadCount) : undefined}
          color="error"
          invisible={unreadCount === 0}
          overlap="circular"
        >
          <NotificationsBellIcon />
        </Badge>
      </IconButton>

      <Popover
        id="notification-menu-popover"
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 360, maxWidth: '100%' },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" component="h2">
            Notifications
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} aria-label="Loading notifications" />
            </Box>
          ) : null}

          {!isLoading && errorMessage ? (
            <Stack spacing={1.5}>
              <Alert severity="error">{errorMessage}</Alert>
              <Button onClick={() => void loadNotifications()} size="small" variant="outlined">
                Retry
              </Button>
            </Stack>
          ) : null}

          {!isLoading && !errorMessage && markReadError ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {markReadError}
            </Alert>
          ) : null}

          {!isLoading && !errorMessage && notifications.length === 0 ? (
            <Alert severity="info">No notifications yet</Alert>
          ) : null}

          {!isLoading && !errorMessage && notifications.length > 0 ? (
            <List disablePadding dense aria-label="Recent notifications">
              {notifications.map((notification) => {
                const isUnread = !notification.readAt;
                const isActing = actingOnId === notification.id;

                return (
                  <ListItemButton
                    key={notification.id}
                    onClick={() => void handleNotificationClick(notification)}
                    disabled={Boolean(isActing)}
                    sx={{
                      alignItems: 'flex-start',
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: isUnread ? 'action.hover' : 'transparent',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          component="span"
                          variant="subtitle2"
                          sx={{ fontWeight: isUnread ? 700 : 500 }}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {notification.body}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {formatNotificationCreatedAt(notification.createdAt)}
                          </Typography>
                        </>
                      }
                      slotProps={{
                        secondary: { component: 'div' },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          ) : null}
        </Box>
      </Popover>
    </>
  );
}
