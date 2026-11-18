import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClassesPage from '@/app/(app)/classes/page';
import { renderWithAppProviders } from '@/test/render-app';
import { CLASS_FIXTURES } from '@/test/class-fixtures';

vi.mock('@/lib/classes/classes-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/classes/classes-client')>(
    '@/lib/classes/classes-client',
  );
  return {
    ...actual,
    listClasses: vi.fn(),
    createClass: vi.fn(),
    updateClass: vi.fn(),
    setClassActive: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    setSectionActive: vi.fn(),
  };
});

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockResolvedValue({
    data: [{ id: 'staff-1', firstName: 'Meera', lastName: 'Iyer', employmentStatus: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

import {
  createClass,
  createSection,
  listClasses,
  parseSectionNames,
  setSectionActive,
} from '@/lib/classes/classes-client';

describe('parseSectionNames', () => {
  it('splits, trims and de-duplicates section names', () => {
    expect(parseSectionNames(' A, b ,B,, C ')).toEqual(['A', 'b', 'C']);
    expect(parseSectionNames('  ')).toEqual([]);
  });
});

describe('ClassesPage', () => {
  beforeEach(() => {
    vi.mocked(listClasses).mockReset().mockResolvedValue(CLASS_FIXTURES);
    vi.mocked(createClass).mockReset();
    vi.mocked(createSection).mockReset();
    vi.mocked(setSectionActive).mockReset();
  });

  it('lists classes with sections, class teachers and student counts', async () => {
    renderWithAppProviders(<ClassesPage />);

    const grade10 = await screen.findByTestId('class-10');
    expect(within(grade10).getByText('3 students')).toBeInTheDocument();
    expect(within(grade10).getByText('Meera Iyer')).toBeInTheDocument();
    expect(within(grade10).getByText('2 / 40')).toBeInTheDocument();
    expect(screen.getByText('2 classes · 3 sections · 3 students')).toBeInTheDocument();
  });

  it('creates a class', async () => {
    vi.mocked(createClass).mockResolvedValue(CLASS_FIXTURES[0]!);
    renderWithAppProviders(<ClassesPage />);
    await screen.findByTestId('class-10');

    fireEvent.click(screen.getByRole('button', { name: 'Add class' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Class name' }), {
      target: { value: 'Grade 11' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add class' }));

    await waitFor(() => {
      expect(createClass).toHaveBeenCalledWith({ name: 'Grade 11', displayOrder: 11 });
    });
  });

  it('adds several sections at once from a comma-separated list', async () => {
    vi.mocked(createSection).mockResolvedValue(CLASS_FIXTURES[0]!.sections[0]!);
    renderWithAppProviders(<ClassesPage />);
    const grade9 = await screen.findByTestId('class-9');

    fireEvent.click(within(grade9).getByRole('button', { name: 'Add section' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Section name(s)' }), {
      target: { value: 'B, C' },
    });
    expect(within(dialog).queryByRole('combobox', { name: 'Class teacher' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add sections' }));

    await waitFor(() => {
      expect(createSection).toHaveBeenCalledTimes(2);
    });
    expect(createSection).toHaveBeenNthCalledWith(1, 'class-9', { name: 'B' });
    expect(createSection).toHaveBeenNthCalledWith(2, 'class-9', { name: 'C' });
  });

  it('shows the reason when a section cannot be deactivated', async () => {
    vi.mocked(setSectionActive).mockRejectedValue(
      new Error('This section still has 2 active student(s). Move them to another section first.'),
    );
    renderWithAppProviders(<ClassesPage />);
    const grade10 = await screen.findByTestId('class-10');

    fireEvent.click(within(grade10).getAllByRole('button', { name: 'Deactivate' })[1]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));

    expect(
      await screen.findByText(/still has 2 active student/),
    ).toBeInTheDocument();
  });
});
