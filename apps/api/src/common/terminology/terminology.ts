import { InstitutionType } from '@prisma/client';

/**
 * Display vocabulary that differs between schools, colleges and institutes.
 * Never hard-code "School", "Class", "Section" or "Principal" in user-facing copy;
 * resolve labels through `resolveTerminology` instead.
 */
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

export const TERMINOLOGY_KEYS: readonly (keyof Terminology)[] = [
  'institution',
  'institutionPlural',
  'unit',
  'unitPlural',
  'group',
  'groupPlural',
  'head',
  'groupTeacher',
  'term',
  'termPlural',
  'admin',
] as const;

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

const MAX_LABEL_LENGTH = 60;

/** Merge per-tenant overrides (OrganizationSettings.terminology) over the type defaults. */
export function resolveTerminology(
  institutionType: InstitutionType | null | undefined,
  overrides?: unknown,
): Terminology {
  const base = DEFAULT_TERMINOLOGY[institutionType ?? InstitutionType.SCHOOL] ?? DEFAULT_TERMINOLOGY.SCHOOL;
  const result: Terminology = { ...base };

  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    const record = overrides as Record<string, unknown>;
    for (const key of TERMINOLOGY_KEYS) {
      const value = record[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0 && trimmed.length <= MAX_LABEL_LENGTH) {
          result[key] = trimmed;
        }
      }
    }
  }

  return result;
}
