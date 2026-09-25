import { Suspense } from 'react';
import { CompleteSignupPageContent } from './complete-signup-page-content';

export default function CompleteSignupPage() {
  return (
    <Suspense fallback={<CompleteSignupPageContent loading />}>
      <CompleteSignupPageContent />
    </Suspense>
  );
}
