import {
  DocumentOwnerType,
  EmploymentStatus,
  Prisma,
  StudentStatus,
  VisitorStatus,
} from '@prisma/client';

export function buildDocumentSubjectSearchWhere(
  organizationId: string,
  ownerType: DocumentOwnerType,
  search?: string,
): Prisma.StudentWhereInput | Prisma.StaffWhereInput | Prisma.VisitorWhereInput {
  const term = search?.trim();
  const insensitive = term ? { contains: term, mode: 'insensitive' as const } : undefined;

  if (ownerType === DocumentOwnerType.STUDENT) {
    return {
      organizationId,
      status: StudentStatus.ACTIVE,
      ...(insensitive
        ? {
            OR: [
              { studentCode: insensitive },
              { firstName: insensitive },
              { lastName: insensitive },
              { displayName: insensitive },
            ],
          }
        : {}),
    };
  }

  if (ownerType === DocumentOwnerType.STAFF) {
    return {
      organizationId,
      employmentStatus: EmploymentStatus.ACTIVE,
      ...(insensitive
        ? {
            OR: [
              { employeeCode: insensitive },
              { firstName: insensitive },
              { lastName: insensitive },
              { displayName: insensitive },
            ],
          }
        : {}),
    };
  }

  return {
    organizationId,
    status: VisitorStatus.CHECKED_IN,
    ...(insensitive
      ? {
          OR: [{ visitorCode: insensitive }, { name: insensitive }],
        }
      : {}),
  };
}
