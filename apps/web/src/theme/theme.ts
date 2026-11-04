import { createTheme } from '@mui/material/styles';

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

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: '#8a5a0b',
      dark: '#6e4608',
      light: '#f8f1de',
      contrastText: '#0f2044',
    },
    secondary: {
      main: '#0f2044',
    },
    success: {
      main: '#16a34a',
    },
    error: {
      main: '#dc2626',
    },
    warning: {
      main: '#d97706',
    },
    background: {
      default: '#f7f4ee',
      paper: '#ffffff',
    },
    divider: '#efe6d6',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    sidebar: {
      main: '#0f2044',
      activeBorder: '#e8c36a',
      text: 'rgba(255,255,255,0.85)',
      textMuted: 'rgba(255,255,255,0.7)',
      textSection: 'rgba(232, 195, 106, 0.72)',
      hover: 'rgba(255,255,255,0.06)',
      active: 'rgba(255,255,255,0.12)',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'var(--font-jakarta), "Segoe UI", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontWeight: 650,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
    },
    body2: {
      fontSize: '0.875rem',
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
          borderRadius: 12,
        },
        containedPrimary: {
          color: '#0f2044',
          background: 'linear-gradient(135deg, #f0d48a 0%, #e0b85c 55%, #c9a24a 100%)',
          boxShadow: '0 4px 14px rgba(154, 116, 32, 0.28)',
          '&:hover': {
            color: '#0f2044',
            background: 'linear-gradient(135deg, #f6e2a8 0%, #e8c36a 100%)',
            boxShadow: '0 6px 18px rgba(154, 116, 32, 0.34)',
          },
        },
        outlined: {
          borderColor: '#e2e8f0',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: '#efe6d6',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02), 0 8px 24px rgba(15, 23, 42, 0.03)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid #efe6d6',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02), 0 8px 24px rgba(15, 23, 42, 0.03)',
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          '&:hover': {
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.06)',
          },
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f8f1de',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#f7f4ee',
          color: '#0f172a',
          borderBottom: '2px solid #e8c36a',
          boxShadow: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            whiteSpace: 'nowrap',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 20,
          paddingRight: 20,
          borderColor: '#f8fafc',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': {
            backgroundColor: 'rgba(201, 162, 74, 0.08)',
          },
        },
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
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 650,
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
          borderRadius: 8,
        },
      },
    },
    MuiLink: {
      defaultProps: {
        underline: 'hover',
      },
      styleOverrides: {
        root: {
          color: '#8a5a0b',
          fontWeight: 600,
        },
      },
    },
    MuiSnackbar: {
      defaultProps: {
        autoHideDuration: 5000,
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiSelect: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e2e8f0',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#cbd5e1',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3.5px rgba(201, 162, 74, 0.28)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#c9a24a',
            borderWidth: 1,
          },
        },
        input: {
          '&:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 100px #ffffff inset',
            WebkitTextFillColor: '#0f172a',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {},
      },
    },
  },
});
