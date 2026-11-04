import { DocumentOwnerType } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { StaffService } from '../staff/staff.service';
import { VisitorsService } from '../visitors/visitors.service';
import { FilesService } from '../files/files.service';
import { DocumentNotificationService } from './document-notification.service';

describe('DocumentsService.listGenerationSubjects', () => {
  const prisma = {
    student: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const service = new DocumentsService(
    prisma as unknown as PrismaService,
    {} as StudentsService,
    {} as StaffService,
    {} as VisitorsService,
    {} as FilesService,
    {} as DocumentNotificationService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('paginates student subjects beyond the first page', async () => {
    prisma.student.findMany.mockResolvedValue([
      {
        id: 'student-101',
        studentCode: 'stu-101',
        firstName: 'Page',
        lastName: 'Two',
        displayName: null,
      },
    ]);
    prisma.student.count.mockResolvedValue(101);

    const result = await service.listGenerationSubjects('org-1', {
      ownerType: DocumentOwnerType.STUDENT,
      page: 2,
      pageSize: 25,
      search: 'stu',
    });

    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
        take: 25,
      }),
    );
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 25,
      total: 101,
      totalPages: 5,
    });
    expect(result.data).toEqual([
      {
        id: 'student-101',
        code: 'stu-101',
        label: 'Page Two',
      },
    ]);
  });
});
