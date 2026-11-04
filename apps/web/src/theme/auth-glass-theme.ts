import { createTheme } from '@mui/material/styles';
import { theme } from '@/theme/theme';

/** Dark navy fields for sign-in and school registration. Gold focus, navy text on gold buttons. */
export const authGlassTheme = createTheme(theme, {
  palette: {
    mode: 'dark',
    primary: { main: '#e8c36a', contrastText: '#0f2044' },
    background: { default: 'transparent', paper: 'transparent' },
    text: { primary: '#ffffff', secondary: '#c4b89a' },
    divider: 'rgba(232, 195, 106, 0.28)',
  },
  components: {
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'medium' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: 'rgba(8, 14, 28, 0.45)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(232, 195, 106, 0.28)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(232, 195, 106, 0.7)',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3.5px rgba(201, 162, 74, 0.28)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e8c36a',
            borderWidth: 1,
          },
        },
        input: {
          color: '#ffffff',
          '&::placeholder': { color: '#a89878', opacity: 1 },
          '&:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 100px #152033 inset',
            WebkitTextFillColor: '#ffffff',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#d9cbb0',
          '&.Mui-focused': { color: '#e8c36a' },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { color: '#c4b89a' },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          color: '#0f2044',
          background: 'linear-gradient(135deg, #f0d48a 0%, #e0b85c 55%, #c9a24a 100%)',
          boxShadow: '0 8px 22px rgba(154, 116, 32, 0.32)',
          '&:hover': {
            color: '#0f2044',
            background: 'linear-gradient(135deg, #f6e2a8 0%, #e8c36a 100%)',
          },
        },
      },
    },
  },
});
