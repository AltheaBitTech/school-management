'use client';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

interface AppSnackbarContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const AppSnackbarContext = createContext<AppSnackbarContextValue | null>(null);

const AUTO_HIDE_MS = 5000;

export function AppSnackbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const show = useCallback((message: string, severity: SnackbarSeverity) => {
    setState({ open: true, message, severity });
  }, []);

  const value = useMemo<AppSnackbarContextValue>(
    () => ({
      showSuccess: (message) => show(message, 'success'),
      showError: (message) => show(message, 'error'),
      showInfo: (message) => show(message, 'info'),
      showWarning: (message) => show(message, 'warning'),
    }),
    [show],
  );

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <AppSnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={AUTO_HIDE_MS}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </AppSnackbarContext.Provider>
  );
}

export function useAppSnackbar(): AppSnackbarContextValue {
  const context = useContext(AppSnackbarContext);
  if (!context) {
    throw new Error('useAppSnackbar must be used within AppSnackbarProvider');
  }
  return context;
}
