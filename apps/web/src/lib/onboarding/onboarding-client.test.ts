import { describe, expect, it } from 'vitest';
import { shouldRedirectToOnboarding } from '@/lib/onboarding/onboarding-client';

describe('shouldRedirectToOnboarding', () => {
  it('redirects incomplete school organizations', () => {
    expect(
      shouldRedirectToOnboarding({
        onboardingCompleted: false,
        organizationId: 'org-1',
        organizationName: 'School',
        organizationCode: 'school-abc',
        timezone: 'UTC',
      }),
    ).toBe(true);
  });

  it('does not redirect completed organizations', () => {
    expect(
      shouldRedirectToOnboarding({
        onboardingCompleted: true,
        organizationId: 'org-1',
        organizationName: 'School',
        organizationCode: 'school-abc',
        timezone: 'UTC',
      }),
    ).toBe(false);
  });

  it('does not redirect platform organization', () => {
    expect(
      shouldRedirectToOnboarding({
        onboardingCompleted: false,
        organizationId: 'org-1',
        organizationName: 'Platform',
        organizationCode: 'campusops-platform',
        timezone: 'UTC',
      }),
    ).toBe(false);
  });
});
