/**
 * Display vocabulary that differs between schools, colleges and institutes.
 * Never hard-code "School", "Class", "Section" or "Principal" in UI copy;
 * read labels from `useTerminology()` instead. Mirrors apps/api/src/common/terminology.
 */
export type InstitutionType = 'SCHOOL' | 'COLLEGE' | 'INSTITUTE';

export const INSTITUTION_TYPE_OPTIONS: { value: InstitutionType; label: string; hint: string }[] = [
  { value: 'SCHOOL', label: 'School', hint: 'Classes and sections' },
  { value: 'COLLEGE', label: 'College', hint: 'Programs, semesters and divisions' },
  { value: 'INSTITUTE', label: 'Institute', hint: 'Courses, modules and batches' },
];

export interface Terminology {
  institution: string;
  institutionPlural: string;
  unit: string;
  unitPlural: string;
  group: string;
  groupPlural: string;
  head: string;
  groupTeacher: string;
  term: string;
  termPlural: string;
  admin: string;
}

export const DEFAULT_TERMINOLOGY: Record<InstitutionType, Terminology> = {
  SCHOOL: {
    institution: 'School',
    institutionPlural: 'Schools',
    unit: 'Class',
    unitPlural: 'Classes',
    group: 'Section',
    groupPlural: 'Sections',
    head: 'Principal',
    groupTeacher: 'Class Teacher',
    term: 'Term',
    termPlural: 'Terms',
    admin: 'School Admin',
  },
  COLLEGE: {
    institution: 'College',
    institutionPlural: 'Colleges',
    unit: 'Program',
    unitPlural: 'Programs',
    group: 'Division',
    groupPlural: 'Divisions',
    head: 'Principal / Dean',
    groupTeacher: 'Class Coordinator',
    term: 'Semester',
    termPlural: 'Semesters',
    admin: 'College Admin',
  },
  INSTITUTE: {
    institution: 'Institute',
    institutionPlural: 'Institutes',
    unit: 'Course',
    unitPlural: 'Courses',
    group: 'Batch',
    groupPlural: 'Batches',
    head: 'Director',
    groupTeacher: 'Batch Coordinator',
    term: 'Module',
    termPlural: 'Modules',
    admin: 'Institute Admin',
  },
};

/** Whether the institution tracks terms/semesters on programs and students. */
export function usesTerms(type: InstitutionType | undefined): boolean {
  return type === 'COLLEGE' || type === 'INSTITUTE';
}

/** Role codes are stable; only their display names follow the institution type. */
export function roleDisplayName(code: string | undefined, fallback: string, terms: Terminology): string {
  if (code === 'SCHOOL_ADMIN') return terms.admin;
  if (code === 'PRINCIPAL') return terms.head;
  return fallback;
}
