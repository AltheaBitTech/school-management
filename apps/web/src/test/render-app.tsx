import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AppThemeProvider } from '@/components/providers/AppThemeProvider';

export function renderWithAppProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AppThemeProvider, ...options });
}
