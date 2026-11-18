import { createTheme } from '@mui/material/styles';
import { theme } from '@/theme/theme';

/**
 * Theme for sign-in, sign-up and school registration cards.
 * The page backdrop is navy; the card itself is a light surface, so this only enlarges inputs and buttons
 * slightly for a more comfortable single-column form.
 */
export const authGlassTheme = createTheme(theme, {
  components: {
    MuiTextField: {
      defaultProps: { variant: 'filled', size: 'medium' },
    },
    MuiButton: {
      styleOverrides: {
        sizeLarge: {
          paddingTop: 11,
          paddingBottom: 11,
        },
      },
    },
  },
});
