import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppSnackbarProvider, useAppSnackbar } from '@/components/providers/AppSnackbarProvider';

function SnackbarTrigger() {
  const { showSuccess } = useAppSnackbar();
  return (
    <button type="button" onClick={() => showSuccess('Saved successfully')}>
      Trigger snackbar
    </button>
  );
}

describe('AppSnackbarProvider', () => {
  it('shows a success snackbar message', async () => {
    render(
      <AppSnackbarProvider>
        <SnackbarTrigger />
      </AppSnackbarProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger snackbar' }));

    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    });
  });
});
