import { alpha, createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    sidebar: {
      main: string;
      activeBorder: string;
      text: string;
      textMuted: string;
      textSection: string;
      hover: string;
      active: string;
    };
  }
  interface PaletteOptions {
    sidebar?: {
      main?: string;
      activeBorder?: string;
      text?: string;
      textMuted?: string;
      textSection?: string;
      hover?: string;
      active?: string;
    };
  }
}

const BRAND_BLUE = '#2563eb';
const NAVY = '#0f2044';
const DIVIDER = '#e3e8f0';
const INPUT_FILL = '#f1f5f9';
const INPUT_FILL_HOVER = '#e9eef5';
const SOFT_SHADOW = '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: BRAND_BLUE,
      dark: '#1d4ed8',
      light: '#eff6ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: NAVY,
    },
    success: {
      main: '#16a34a',
      light: '#dcfce7',
    },
    error: {
      main: '#dc2626',
      light: '#fee2e2',
    },
    warning: {
      main: '#d97706',
      light: '#fef3c7',
    },
    info: {
      main: '#0284c7',
      light: '#e0f2fe',
    },
    background: {
      default: '#f4f6fb',
      paper: '#ffffff',
    },
    divider: DIVIDER,
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    sidebar: {
      main: NAVY,
      activeBorder: '#3b82f6',
      text: 'rgba(255,255,255,0.86)',
      textMuted: 'rgba(255,255,255,0.68)',
      textSection: 'rgba(191, 210, 255, 0.6)',
      hover: 'rgba(255,255,255,0.06)',
      active: 'rgba(255,255,255,0.12)',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'var(--font-jakarta), "Segoe UI", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h4: {
      fontSize: '1.625rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 650,
    },
    subtitle1: {
      fontWeight: 650,
    },
    body2: {
      fontSize: '0.875rem',
    },
    overline: {
      fontWeight: 700,
      letterSpacing: '0.08em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        containedPrimary: ({ theme }) => ({
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          '&:hover': {
            borderColor: '#cbd5e1',
            backgroundColor: '#f8fafc',
          },
        }),
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundImage: 'none',
        },
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          boxShadow: SOFT_SHADOW,
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 14,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: SOFT_SHADOW,
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.08)',
          },
        }),
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
          },
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            borderBottom: `1px solid ${theme.palette.divider}`,
            whiteSpace: 'nowrap',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 20,
          paddingRight: 20,
          borderColor: '#eef2f7',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
          '&:last-child td': {
            borderBottom: 0,
          },
        }),
      },
    },
    MuiChip: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 999,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiLink: {
      defaultProps: {
        underline: 'hover',
      },
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.main,
          fontWeight: 600,
        }),
      },
    },
    MuiSnackbar: {
      defaultProps: {
        autoHideDuration: 5000,
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
        size: 'small',
      },
    },
    MuiSelect: {
      defaultProps: {
        variant: 'filled',
        size: 'small',
      },
    },
    MuiFormControl: {
      defaultProps: {
        variant: 'filled',
        size: 'small',
      },
      styleOverrides: {
        root: {
          // Filled inputs reserve top space for the floating label; centre text when there is no label.
          '&:not(:has(> .MuiInputLabel-root)) .MuiFilledInput-input': {
            paddingTop: 10,
            paddingBottom: 10,
          },
          '&:not(:has(> .MuiInputLabel-root)) .MuiInputAdornment-positionStart': {
            marginTop: '0 !important',
          },
        },
      },
    },
    MuiFilledInput: {
      defaultProps: {
        disableUnderline: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          backgroundColor: INPUT_FILL,
          border: '1px solid transparent',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            backgroundColor: INPUT_FILL_HOVER,
          },
          '&.Mui-focused': {
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
          '&.Mui-error': {
            borderColor: theme.palette.error.main,
          },
          '&.Mui-error.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.16)}`,
          },
          '&.Mui-disabled': {
            backgroundColor: '#f8fafc',
          },
        }),
        input: ({ theme }) => ({
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${INPUT_FILL} inset`,
            WebkitTextFillColor: theme.palette.text.primary,
            borderRadius: 'inherit',
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          backgroundColor: theme.palette.background.paper,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#cbd5e1',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
          },
        }),
        input: ({ theme }) => ({
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
            WebkitTextFillColor: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: NAVY,
          fontSize: '0.75rem',
          borderRadius: 8,
        },
      },
    },
  },
});
