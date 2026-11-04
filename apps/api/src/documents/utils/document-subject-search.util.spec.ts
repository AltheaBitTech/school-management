import { DocumentOwnerType, StudentStatus, VisitorStatus } from '@prisma/client';
import { buildDocumentSubjectSearchWhere } from './document-subject-search.util';

describe('buildDocumentSubjectSearchWhere', () => {
  const organizationId = 'org-1';

  it('scopes students to the organization and active status', () => {
    expect(buildDocumentSubjectSearchWhere(organizationId, DocumentOwnerType.STUDENT)).toEqual({
      organizationId,
      status: StudentStatus.ACTIVE,
    });
  });

  it('searches students by code and name fields', () => {
    expect(
      buildDocumentSubjectSearchWhere(organizationId, DocumentOwnerType.STUDENT, ' adm- '),
    ).toEqual({
      organizationId,
      status: StudentStatus.ACTIVE,
      OR: [
        { studentCode: { contains: 'adm-', mode: 'insensitive' } },
        { firstName: { contains: 'adm-', mode: 'insensitive' } },
        { lastName: { contains: 'adm-', mode: 'insensitive' } },
        { displayName: { contains: 'adm-', mode: 'insensitive' } },
      ],
    });
  });

  it('searches checked-in visitors by code and name', () => {
    expect(
      buildDocumentSubjectSearchWhere(organizationId, DocumentOwnerType.VISITOR, 'guest'),
    ).toMatchObject({
      organizationId,
      status: VisitorStatus.CHECKED_IN,
      OR: [
        { visitorCode: { contains: 'guest', mode: 'insensitive' } },
        { name: { contains: 'guest', mode: 'insensitive' } },
      ],
    });
  });
});
