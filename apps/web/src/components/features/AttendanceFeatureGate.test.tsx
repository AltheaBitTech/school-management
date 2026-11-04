import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceFeatureGate } from './AttendanceFeatureGate';
import {
  resetFeatureFlagsCacheForTests,
  setFeatureFlagsFromSession,
} from '@/lib/features/feature-flags';

describe('AttendanceFeatureGate', () => {
  it('shows disabled notice without rendering children when attendance is off', () => {
    setFeatureFlagsFromSession({ attendanceEnabled: false });
    render(
      <AttendanceFeatureGate>
        <div>Attendance content</div>
      </AttendanceFeatureGate>,
    );
    expect(screen.getByText(/Attendance is turned off/i)).toBeInTheDocument();
    expect(screen.queryByText('Attendance content')).not.toBeInTheDocument();
    resetFeatureFlagsCacheForTests();
  });

  it('renders children when attendance is enabled', () => {
    setFeatureFlagsFromSession({ attendanceEnabled: true });
    render(
      <AttendanceFeatureGate>
        <div>Attendance content</div>
      </AttendanceFeatureGate>,
    );
    expect(screen.getByText('Attendance content')).toBeInTheDocument();
    resetFeatureFlagsCacheForTests();
  });
});
