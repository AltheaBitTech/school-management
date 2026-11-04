import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ParentSelfService } from './parent-self.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ParentSelfService parent lookup', () => {
  const organizationId = 'org-1';
  const studentId = 'student-1';
  let service: ParentSelfService;
  let prisma: {
    student: { findFirst: jest.Mock };
    user: { findMany: jest.Mock };
    parentStudentLink: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      student: { findFirst: jest.fn().mockResolvedValue({ id: studentId }) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      parentStudentLink: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new ParentSelfService(prisma as unknown as PrismaService);
  });

  it('rejects a parent search shorter than 2 characters', async () => {
    await expect(service.searchParentCandidates(organizationId, studentId, 'a')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('searches only PARENT accounts in the current organization', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'parent@school.example',
        staffProfile: { displayName: 'Ada Parent', firstName: 'Ada', lastName: 'Parent' },
      },
    ]);

    const result = await service.searchParentCandidates(organizationId, studentId, 'ada');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          userRoles: { some: { role: { code: 'PARENT' } } },
        }),
        take: 8,
      }),
    );
    expect(result.data).toEqual([
      { id: 'user-1', email: 'parent@school.example', name: 'Ada Parent' },
    ]);
  });

  it('does not search parents for a student outside the organization', async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.searchParentCandidates(organizationId, studentId, 'ada'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('lists linked parents with a display name', async () => {
    prisma.parentStudentLink.findMany.mockResolvedValue([
      {
        id: 'link-1',
        parent: {
          id: 'user-1',
          email: 'parent@school.example',
          staffProfile: { displayName: null, firstName: 'Ada', lastName: 'Parent' },
        },
      },
    ]);

    const result = await service.listLinkedParents(organizationId, studentId);

    expect(prisma.parentStudentLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId, studentId },
      }),
    );
    expect(result.data).toEqual([
      {
        linkId: 'link-1',
        parentUserId: 'user-1',
        email: 'parent@school.example',
        name: 'Ada Parent',
      },
    ]);
  });
});
