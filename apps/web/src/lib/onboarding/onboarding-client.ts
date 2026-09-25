import { apiClient } from '@/lib/api/client';

export interface OnboardingState {
  onboardingCompleted: boolean;
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  timezone: string;
}

interface OnboardingStateResponse {
  data: OnboardingState;
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const response = await apiClient.get<OnboardingStateResponse>('/onboarding/state', { auth: true });
  return response.data;
}

export async function updateOnboardingSetup(input: {
  organizationName?: string;
  timezone?: string;
}): Promise<OnboardingState> {
  const response = await apiClient.post<OnboardingStateResponse>('/onboarding/setup', input, {
    auth: true,
  });
  return response.data;
}

export async function finishOnboarding(): Promise<OnboardingState> {
  const response = await apiClient.post<OnboardingStateResponse>('/onboarding/finish', {}, {
    auth: true,
  });
  return response.data;
}

export function shouldRedirectToOnboarding(state: OnboardingState): boolean {
  return !state.onboardingCompleted && state.organizationCode !== 'campusops-platform';
}
