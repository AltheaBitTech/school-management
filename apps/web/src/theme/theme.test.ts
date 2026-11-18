import { describe, expect, it } from 'vitest';
import { theme } from '@/theme/theme';

describe('theme', () => {
  it('uses the brand palette and filled input defaults', () => {
    expect(theme.palette.primary.main).toBe('#2563eb');
    expect(theme.palette.background.default).toBe('#f4f6fb');
    expect(theme.shape.borderRadius).toBe(10);
    expect(theme.components?.MuiTextField?.defaultProps?.variant).toBe('filled');
    expect(theme.components?.MuiSelect?.defaultProps?.variant).toBe('filled');
    expect(theme.palette.sidebar.main).toBe('#0f2044');
  });
});
