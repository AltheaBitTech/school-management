import type {} from '@mui/material/themeCssVarsAugmentation';
import { alpha, createTheme } from '@mui/material/styles';

interface SidebarPalette {
  main: string;
  border: string;
  activeBorder: string;
  text: string;
  textMuted: string;
  textSection: string;
  hover: string;
  active: string;
  activeText: string;
}

interface BrandPalette {
  /** Deep navy used for print headers and the auth backdrop. */
  navy: string;
  /** Primary → violet gradient for logo marks, heroes and accents. */
  gradient: string;
  /** Faint wash of the gradient for tinted surfaces. */
  gradientSoft: string;
  /** Translucent surface for the sticky glass top bar. */
  glass: string;
  /** Layered card shadow (light) / hairline glow (dark). */
  shadow: string;
  shadowHover: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    sidebar: SidebarPalette;
    brand: BrandPalette;
  }
  interface PaletteOptions {
    sidebar?: Partial<SidebarPalette>;
    brand?: Partial<BrandPalette>;
  }
}

const BRAND_BLUE = '#2563eb';
const NAVY = '#0f2044';
const GRADIENT = 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)';

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: BRAND_BLUE, dark: '#1d4ed8', light: '#eff6ff', contrastText: '#ffffff' },
        secondary: { main: '#7c3aed', light: '#f3e8ff', contrastText: '#ffffff' },
        success: { main: '#16a34a', light: '#dcfce7' },
        error: { main: '#dc2626', light: '#fee2e2' },
        warning: { main: '#d97706', light: '#fef3c7' },
        info: { main: '#0284c7', light: '#e0f2fe' },
        background: { default: '#f6f7fb', paper: '#ffffff' },
        divider: '#e6e9f0',
        text: { primary: '#0f172a', secondary: '#526075' },
        action: { hover: 'rgba(15, 23, 42, 0.04)' },
        sidebar: {
          main: '#ffffff',
          border: '#e6e9f0',
          activeBorder: BRAND_BLUE,
          text: '#334155',
          textMuted: '#64748b',
          textSection: '#94a3b8',
          hover: 'rgba(15, 23, 42, 0.04)',
          active: alpha(BRAND_BLUE, 0.09),
          activeText: '#1d4ed8',
        },
        brand: {
          navy: NAVY,
          gradient: GRADIENT,
          gradientSoft: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.08) 100%)',
          glass: 'rgba(255, 255, 255, 0.78)',
          shadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 24px -8px rgba(15, 23, 42, 0.08)',
          shadowHover: '0 2px 4px rgba(15, 23, 42, 0.04), 0 16px 40px -12px rgba(15, 23, 42, 0.16)',
        },
      },
    },
    dark: {
      palette: {
        primary: { main: '#60a5fa', dark: '#3b82f6', light: 'rgba(96, 165, 250, 0.14)', contrastText: '#0b1120' },
        secondary: { main: '#a78bfa', light: 'rgba(167, 139, 250, 0.14)', contrastText: '#0b1120' },
        success: { main: '#4ade80', light: 'rgba(74, 222, 128, 0.14)' },
        error: { main: '#f87171', light: 'rgba(248, 113, 113, 0.14)' },
        warning: { main: '#fbbf24', light: 'rgba(251, 191, 36, 0.14)' },
        info: { main: '#38bdf8', light: 'rgba(56, 189, 248, 0.14)' },
        background: { default: '#0b1120', paper: '#111827' },
        divider: 'rgba(148, 163, 184, 0.16)',
        text: { primary: '#e2e8f0', secondary: '#94a3b8' },
        sidebar: {
          main: '#0d1424',
          border: 'rgba(148, 163, 184, 0.12)',
          activeBorder: '#60a5fa',
          text: '#cbd5e1',
          textMuted: '#94a3b8',
          textSection: '#64748b',
          hover: 'rgba(148, 163, 184, 0.08)',
          active: 'rgba(96, 165, 250, 0.14)',
          activeText: '#93c5fd',
        },
        brand: {
          navy: NAVY,
          gradient: GRADIENT,
          gradientSoft: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(167,139,250,0.12) 100%)',
          glass: 'rgba(11, 17, 32, 0.72)',
          shadow: '0 0 0 1px rgba(148, 163, 184, 0.04), 0 8px 24px -12px rgba(0, 0, 0, 0.6)',
          shadowHover: '0 0 0 1px rgba(148, 163, 184, 0.08), 0 16px 40px -12px rgba(0, 0, 0, 0.7)',
        },
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'var(--font-jakarta), "Segoe UI", sans-serif',
    h3: { fontWeight: 750, letterSpacing: '-0.035em' },
    h4: {
      fontSize: 'clamp(1.375rem, 1.1rem + 1vw, 1.75rem)',
      fontWeight: 750,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
    },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 650, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 650 },
    body2: { fontSize: '0.875rem' },
    overline: { fontWeight: 700, letterSpacing: '0.08em' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.005em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': {
          backgroundColor: alpha(BRAND_BLUE, 0.2),
        },
        '*:focus-visible': {
          outlineColor: theme.vars.palette.primary.main,
        },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease',
          '&:active': { transform: 'translateY(1px)' },
        },
        sizeLarge: { paddingTop: 10, paddingBottom: 10 },
        containedPrimary: ({ theme }) => ({
          backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.12)} 0%, transparent 100%)`,
          boxShadow: `0 1px 2px ${alpha('#0f172a', 0.12)}, inset 0 1px 0 ${alpha('#ffffff', 0.16)}`,
          '&:hover': {
            backgroundColor: theme.vars.palette.primary.dark,
            boxShadow: `0 4px 14px -4px ${alpha(BRAND_BLUE, 0.5)}`,
          },
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.vars.palette.divider,
          backgroundColor: theme.vars.palette.background.paper,
          '&:hover': {
            borderColor: theme.vars.palette.text.secondary,
            backgroundColor: theme.vars.palette.action.hover,
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 16, backgroundImage: 'none' },
        outlined: ({ theme }) => ({
          borderColor: theme.vars.palette.divider,
          boxShadow: theme.vars.palette.brand.shadow,
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          border: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: theme.vars.palette.brand.shadow,
          transition: 'box-shadow 200ms ease, border-color 200ms ease, transform 200ms ease',
          '&:has(.MuiCardActionArea-root):hover': {
            boxShadow: theme.vars.palette.brand.shadowHover,
            transform: 'translateY(-2px)',
          },
        }),
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0 },
          '&:hover': { backgroundColor: theme.vars.palette.action.hover },
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.brand.glass,
          backdropFilter: 'saturate(180%) blur(14px)',
          WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          color: theme.vars.palette.text.primary,
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: 'none',
          borderRadius: 0,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRadius: 0 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: theme.vars.palette.text.secondary,
            backgroundColor: theme.vars.palette.action.hover,
            borderBottom: `1px solid ${theme.vars.palette.divider}`,
            whiteSpace: 'nowrap',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 20,
          paddingRight: 20,
          borderColor: theme.vars.palette.divider,
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: 'background-color 120ms ease',
          '&.MuiTableRow-hover:hover': {
            backgroundColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.05)`,
          },
          '&:last-child td': { borderBottom: 0 },
        }),
      },
    },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 20,
          border: `1px solid ${theme.vars.palette.divider}`,
          '&.MuiDialog-paperFullScreen': { borderRadius: 0, border: 'none' },
          // Phones: every dialog uses the full width with a small gutter instead of a cramped centred box.
          [theme.breakpoints.down('sm')]: {
            '&:not(.MuiDialog-paperFullScreen)': {
              margin: 12,
              width: 'calc(100% - 24px)',
              maxWidth: 'calc(100% - 24px)',
              maxHeight: 'calc(100% - 24px)',
              borderRadius: 18,
            },
          },
        }),
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          '&:not(.MuiBackdrop-invisible)': {
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: '12px 24px 20px',
          flexWrap: 'wrap',
          gap: 8,
          '& > :not(style) ~ :not(style)': { marginLeft: 0 },
          [theme.breakpoints.down('sm')]: { padding: '12px 16px 16px' },
        }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 14,
          border: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: theme.vars.palette.brand.shadowHover,
        }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 14,
          border: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: theme.vars.palette.brand.shadowHover,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.vars.palette.primary.main,
          fontWeight: 600,
        }),
      },
    },
    MuiSnackbar: {
      defaultProps: { autoHideDuration: 5000 },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          '&:before': { display: 'none' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'filled', size: 'small' },
    },
    MuiSelect: {
      defaultProps: { variant: 'filled', size: 'small' },
    },
    MuiFormControl: {
      defaultProps: { variant: 'filled', size: 'small' },
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
      defaultProps: { disableUnderline: true },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          backgroundColor: `rgba(${theme.vars.palette.text.primaryChannel} / 0.045)`,
          border: '1px solid transparent',
          transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
          '&:hover': {
            backgroundColor: `rgba(${theme.vars.palette.text.primaryChannel} / 0.07)`,
          },
          '&.Mui-focused': {
            backgroundColor: theme.vars.palette.background.paper,
            borderColor: theme.vars.palette.primary.main,
            boxShadow: `0 0 0 3px rgba(${theme.vars.palette.primary.mainChannel} / 0.18)`,
          },
          '&.Mui-error': { borderColor: theme.vars.palette.error.main },
          '&.Mui-error.Mui-focused': {
            boxShadow: `0 0 0 3px rgba(${theme.vars.palette.error.mainChannel} / 0.16)`,
          },
          '&.Mui-disabled': {
            backgroundColor: `rgba(${theme.vars.palette.text.primaryChannel} / 0.025)`,
          },
        }),
        input: ({ theme }) => ({
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${theme.vars.palette.background.paper} inset`,
            WebkitTextFillColor: theme.vars.palette.text.primary,
            caretColor: theme.vars.palette.text.primary,
            borderRadius: 'inherit',
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          backgroundColor: theme.vars.palette.background.paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.text.secondary },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.primary.main,
            borderWidth: 1,
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px rgba(${theme.vars.palette.primary.mainChannel} / 0.18)`,
          },
        }),
        input: ({ theme }) => ({
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${theme.vars.palette.background.paper} inset`,
            WebkitTextFillColor: theme.vars.palette.text.primary,
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontSize: '0.75rem',
          borderRadius: 8,
          padding: '6px 10px',
        },
      },
    },
  },
});

/** CSS-variable references for brand tokens, usable directly in `sx` (follow the active color scheme). */
export const brandVars = {
  gradient: 'var(--mui-palette-brand-gradient)',
  gradientSoft: 'var(--mui-palette-brand-gradientSoft)',
  glass: 'var(--mui-palette-brand-glass)',
  shadow: 'var(--mui-palette-brand-shadow)',
  shadowHover: 'var(--mui-palette-brand-shadowHover)',
  navy: 'var(--mui-palette-brand-navy, #0f2044)',
} as const;
