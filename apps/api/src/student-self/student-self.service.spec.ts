import { DocumentOwnerType } from '@prisma/client';
import { StudentSelfService } from './student-self.service';

describe('StudentSelfService.downloadOwnDocument', () => {
  const user = {
    userId: 'user-1',
    organizationId: 'org-a',
    sessionId: 's',
    email: 'student@example.com',
  };
  let prisma: { generatedDocument: { findFirst: jest.Mock } };
  let documentsService: { download: jest.Mock };
  let service: StudentSelfService;

  beforeEach(() => {
    prisma = { generatedDocument: { findFirst: jest.fn() } };
    documentsService = {
      download: jest.fn().mockResolvedValue({
        file: { mimeType: 'application/pdf', size: 3 },
        buffer: Buffer.from('pdf'),
        disposition: 'attachment; filename="student-id.pdf"',
      }),
    };
    const studentContext = { resolveStudentProfile: jest.fn().mockResolvedValue({ id: 'student-1' }) };
    const unused = {} as never;
    service = new StudentSelfService(
      studentContext as never,
      unused,
      unused,
      unused,
      documentsService as never,
      unused,
      prisma as never,
    );
  });

  it('only looks up documents owned by the requesting student', async () => {
    prisma.generatedDocument.findFirst.mockResolvedValue({ id: 'doc-1' });

    await service.downloadOwnDocument(user, 'doc-1');

    expect(prisma.generatedDocument.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'doc-1',
        organizationId: 'org-a',
        ownerType: DocumentOwnerType.STUDENT,
        ownerId: 'student-1',
      },
      select: { id: true },
    });
    expect(documentsService.download).toHaveBeenCalledWith('org-a', 'doc-1');
  });

  it("returns 404 for another student's document", async () => {
    prisma.generatedDocument.findFirst.mockResolvedValue(null);

    await expect(service.downloadOwnDocument(user, 'doc-other')).rejects.toMatchObject({
      status: 404,
    });
    expect(documentsService.download).not.toHaveBeenCalled();
  });
});
