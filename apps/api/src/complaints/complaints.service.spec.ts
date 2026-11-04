import { NotFoundException } from '@nestjs/common';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { ComplaintNotificationService } from './complaint-notification.service';
import { ComplaintsService } from './complaints.service';

describe('ComplaintsService.downloadAttachment', () => {
  const organizationId = 'org-1';
  const complaintId = 'complaint-1';
  const fileId = 'file-1';

  const filesService = {
    download: jest.fn(),
  } as unknown as FilesService;

  const complaintNotificationService = {
    notifyAssigned: jest.fn(),
    notifyStatusChanged: jest.fn(),
  } as unknown as ComplaintNotificationService;

  let prisma: {
    complaint: { findFirst: jest.Mock };
    complaintAttachment: { findFirst: jest.Mock };
  };

  let service: ComplaintsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      complaint: { findFirst: jest.fn() },
      complaintAttachment: { findFirst: jest.fn() },
    };
    service = new ComplaintsService(
      prisma as unknown as PrismaService,
      complaintNotificationService,
      filesService,
    );
  });

  it('downloads when complaint is in scope and file is linked', async () => {
    prisma.complaint.findFirst.mockResolvedValue({
      id: complaintId,
      createdByUserId: 'user-1',
      assignedToStaffId: 'staff-1',
    });
    prisma.complaintAttachment.findFirst.mockResolvedValue({ id: 'link-1' });
    (filesService.download as jest.Mock).mockResolvedValue({
      file: { mimeType: 'image/jpeg', originalName: 'proof.jpg', size: 10 },
      buffer: Buffer.from('jpeg'),
    });

    const result = await service.downloadAttachment(organizationId, complaintId, fileId, {
      mode: 'assignee',
      staffId: 'staff-1',
    });

    expect(result.buffer).toEqual(Buffer.from('jpeg'));
    expect(filesService.download).toHaveBeenCalledWith(organizationId, fileId);
  });

  it('returns not found when assignee scope does not match the complaint', async () => {
    prisma.complaint.findFirst.mockResolvedValue({
      id: complaintId,
      createdByUserId: 'user-1',
      assignedToStaffId: 'staff-2',
    });

    await expect(
      service.downloadAttachment(organizationId, complaintId, fileId, {
        mode: 'assignee',
        staffId: 'staff-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(filesService.download).not.toHaveBeenCalled();
  });

  it('returns not found when file is not linked to the complaint', async () => {
    prisma.complaint.findFirst.mockResolvedValue({
      id: complaintId,
      createdByUserId: 'user-1',
      assignedToStaffId: 'staff-1',
    });
    prisma.complaintAttachment.findFirst.mockResolvedValue(null);

    await expect(
      service.downloadAttachment(organizationId, complaintId, fileId, { mode: 'organization' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(filesService.download).not.toHaveBeenCalled();
  });
});
