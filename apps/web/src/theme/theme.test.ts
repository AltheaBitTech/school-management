import { describe, expect, it } from 'vitest';
import type { Palette } from '@mui/material/styles';
import { theme } from '@/theme/theme';

const schemes = (theme as unknown as { colorSchemes: Record<'light' | 'dark', { palette: Palette }> })
  .colorSchemes;

describe('theme', () => {
  it('uses the brand palette and filled input defaults', () => {
    expect(schemes.light.palette.primary.main).toBe('#2563eb');
    expect(schemes.light.palette.background.default).toBe('#f6f7fb');
    expect(theme.shape.borderRadius).toBe(12);
    expect(theme.components?.MuiTextField?.defaultProps?.variant).toBe('filled');
    expect(theme.components?.MuiSelect?.defaultProps?.variant).toBe('filled');
    expect(schemes.light.palette.brand.navy).toBe('#0f2044');
  });

  it('defines a dark color scheme with sidebar and brand tokens', () => {
    const dark = schemes.dark.palette;
    expect(dark?.mode).toBe('dark');
    expect(dark?.background.default).toBe('#0b1120');
    expect(dark?.sidebar.main).toBeTruthy();
    expect(dark?.brand.gradient).toContain('linear-gradient');
  });
});
