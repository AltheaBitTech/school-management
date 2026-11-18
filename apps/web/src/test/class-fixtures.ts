import type { SchoolClass } from '@/lib/classes/classes-client';

const timestamps = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' };

function section(id: string, classId: string, name: string, extra: Partial<SchoolClass['sections'][number]> = {}) {
  return {
    id,
    classId,
    name,
    status: 'ACTIVE' as const,
    capacity: null,
    classTeacherId: null,
    classTeacherName: null,
    studentCount: 0,
    ...timestamps,
    ...extra,
  };
}

export const CLASS_FIXTURES: SchoolClass[] = [
  {
    id: 'class-10',
    organizationId: 'org-1',
    name: '10',
    displayOrder: 10,
    status: 'ACTIVE',
    studentCount: 3,
    sections: [
      section('sec-a', 'class-10', 'A', { studentCount: 2, capacity: 40, classTeacherId: 'staff-1', classTeacherName: 'Meera Iyer' }),
      section('sec-b', 'class-10', 'B', { studentCount: 1 }),
    ],
    ...timestamps,
  },
  {
    id: 'class-9',
    organizationId: 'org-1',
    name: '9',
    displayOrder: 9,
    status: 'ACTIVE',
    studentCount: 0,
    sections: [section('sec-9a', 'class-9', 'A')],
    ...timestamps,
  },
];
