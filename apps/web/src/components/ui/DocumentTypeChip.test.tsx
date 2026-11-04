import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { DocumentTypeChip } from '@/components/ui/DocumentTypeChip';
import { renderWithAppProviders } from '@/test/render-app';

describe('DocumentTypeChip', () => {
  it('renders document type label with icon', () => {
    renderWithAppProviders(<DocumentTypeChip documentType="BONAFIDE_CERTIFICATE" />);
    expect(screen.getByText('Bonafide Certificate')).toBeInTheDocument();
  });
});
