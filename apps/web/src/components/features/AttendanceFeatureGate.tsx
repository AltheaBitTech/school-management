'use client';

import { FeatureDisabledNotice } from '@/components/feedback/FeatureDisabledNotice';
import { isAttendanceEnabled } from '@/lib/features/feature-flags';

const DISABLED_COPY = {
  title: 'Attendance is turned off',
  description:
    'This deployment has disabled staff attendance. Navigation, reports, and APIs stay unavailable until FEATURE_ATTENDANCE_ENABLED is enabled again.',
} as const;

export function AttendanceFeatureGate({ children }: { children: React.ReactNode }) {
  if (!isAttendanceEnabled()) {
    return <FeatureDisabledNotice {...DISABLED_COPY} />;
  }

  return children;
}
