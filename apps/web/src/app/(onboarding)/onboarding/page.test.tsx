import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OnboardingPage from '@/app/(onboarding)/onboarding/page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/onboarding/onboarding-client', () => ({
  getOnboardingState: vi.fn(),
  updateOnboardingSetup: vi.fn(),
  finishOnboarding: vi.fn(),
}));

vi.mock('@/lib/rbac/roles-client', () => ({
  listOrganizationRoles: vi.fn(),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  createStaff: vi.fn(),
  provisionStaffLogin: vi.fn(),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

import {
  finishOnboarding,
  getOnboardingState,
  updateOnboardingSetup,
} from '@/lib/onboarding/onboarding-client';
import { listOrganizationRoles } from '@/lib/rbac/roles-client';

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOnboardingState).mockResolvedValue({
      onboardingCompleted: false,
      organizationId: 'org-1',
      organizationName: 'Test School',
      organizationCode: 'school-test',
      timezone: 'UTC',
    });
    vi.mocked(listOrganizationRoles).mockResolvedValue([
      { id: 'role-1', code: 'SCHOOL_ADMIN', name: 'School Admin' },
    ]);
    vi.mocked(updateOnboardingSetup).mockResolvedValue({
      onboardingCompleted: false,
      organizationId: 'org-1',
      organizationName: 'Updated School',
      organizationCode: 'school-test',
      timezone: 'Asia/Kolkata',
    });
    vi.mocked(finishOnboarding).mockResolvedValue({
      onboardingCompleted: true,
      organizationId: 'org-1',
      organizationName: 'Updated School',
      organizationCode: 'school-test',
      timezone: 'Asia/Kolkata',
    });
  });

  it('renders school setup step', async () => {
    render(<OnboardingPage />);

    expect(await screen.findByText('School Setup')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test School')).toBeInTheDocument();
  });

  it('progresses to staff step after saving school setup', async () => {
    render(<OnboardingPage />);

    await screen.findByText('School Setup');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(updateOnboardingSetup).toHaveBeenCalledWith({
        organizationName: 'Test School',
        timezone: 'UTC',
      });
      expect(screen.getByText('Initial Staff (Optional)')).toBeInTheDocument();
    });
  });

  it('allows skipping staff setup and finishing onboarding', async () => {
    render(<OnboardingPage />);

    await screen.findByText('School Setup');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Initial Staff (Optional)');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish Setup' }));

    await waitFor(() => {
      expect(finishOnboarding).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
