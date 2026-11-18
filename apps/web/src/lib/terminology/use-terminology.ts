'use client';

import { useOptionalAuthSession } from '@/components/providers/AuthSessionProvider';
import { DEFAULT_TERMINOLOGY, type InstitutionType, type Terminology } from './terminology';

export interface TerminologyContext extends Terminology {
  institutionType: InstitutionType;
}

/**
 * Labels for the signed-in organization. Falls back to school vocabulary
 * outside a session (public pages, unit tests).
 */
export function useTerminology(): TerminologyContext {
  const session = useOptionalAuthSession();
  const organization = session?.user?.organization;
  const institutionType: InstitutionType = organization?.institutionType ?? 'SCHOOL';
  const terms = organization?.terminology ?? DEFAULT_TERMINOLOGY[institutionType] ?? DEFAULT_TERMINOLOGY.SCHOOL;
  return { ...terms, institutionType };
}
