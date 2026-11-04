import { describe, expect, it } from 'vitest';
import { theme } from '@/theme/theme';

describe('theme', () => {
  it('uses the Phase 1 palette and defaults', () => {
    expect(theme.palette.primary.main).toBe('#8a5a0b');
    expect(theme.palette.background.default).toBe('#f7f4ee');
    expect(theme.shape.borderRadius).toBe(12);
    expect(theme.components?.MuiTextField?.defaultProps?.variant).toBe('outlined');
    expect(theme.components?.MuiSelect?.defaultProps?.variant).toBe('outlined');
    expect(theme.palette.sidebar.main).toBe('#0f2044');
  });
});
