import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DepartmentStatus,
  EmploymentStatus,
  StudentStatus,
  Notice,
  NoticeAudience,
  NoticeAudienceType,
  NoticeRead,
  NoticeStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NOTICE_ERROR_CODES } from './constants/notice.constants';
import { CreateNoticeDto, NoticeAudienceInputDto, UpdateNoticeDto } from './dto/notice.dto';
import { ListNoticesQueryDto } from './dto/list-notices-query.dto';
import {
  NoticeRecipientAudienceContext,
  userMatchesAudiences,
} from './utils/notice-audience.util';
import {
  canPublishNotice,
  isEditableNoticeStatus,
  resolveStatusAfterScheduleChange,
} from './utils/notice-status.util';
import { NoticeNotificationService } from './notice-notification.service';

const userSummarySelect = {
  id: true,
  email: true,
} as const;

const departmentSummarySelect = {
  id: true,
  name: true,
  code: true,
} as const;

const audienceInclude = {
  department: { select: departmentSummarySelect },
} as const;

const fileSummarySelect = {
  id: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
} as const;

const noticeInclude = {
  createdBy: { select: userSummarySelect },
  audiences: { include: audienceInclude },
  attachments: {
    include: {
      file: { select: fileSummarySelect },
    },
  },
} as const;

type NoticeWithRelations = Notice & {
  createdBy: { id: string; email: string };
  audiences: Array<
    NoticeAudience & {
      department: { id: string; name: string; code: string } | null;
    }
  >;
  attachments?: Array<{
    id: string;
    fileId: string;
    file: {
      id: string;
      originalName: string;
      mimeType: string;
      size: number;
      createdAt: Date;
    };
  }>;
  reads?: NoticeRead[];
};

@Injectable()
export class NoticesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly noticeNotificationService: NoticeNotificationService,
  ) {}

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateNoticeDto,
  ): Promise<NoticeWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await this.validateAudiences(tx, organizationId, dto.audiences);
      if (dto.attachmentFileIds?.length) {
        await this.assertNoticeAttachmentFiles(tx, organizationId, dto.attachmentFileIds);
      }

      const notice = await tx.notice.create({
        data: {
          organizationId,
          title: dto.title.trim(),
          content: dto.content.trim(),
          status: NoticeStatus.DRAFT,
          createdByUserId: actor.userId,
          audiences: {
            create: dto.audiences.map((audience) => ({
              organizationId,
              audienceType: audience.audienceType,
              departmentId:
                audience.audienceType === NoticeAudienceType.DEPARTMENT
                  ? audience.departmentId ?? null
                  : null,
            })),
          },
          ...(dto.attachmentFileIds?.length
            ? {
                attachments: {
                  create: dto.attachmentFileIds.map((fileId) => ({
                    organizationId,
                    fileId,
                  })),
                },
              }
            : {}),
        },
        include: noticeInclude,
      });

      return notice;
    });
  }

  async list(
    organizationId: string,
    actor: AuthenticatedUser,
    query: ListNoticesQueryDto,
    canPublish: boolean,
  ) {
    const staffContext = await this.getAudienceContext(organizationId, actor.userId);
    const searchFilter = query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' as const } },
            { content: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const audienceFilter =
      query.audienceType || query.departmentId
        ? {
            audiences: {
              some: {
                ...(query.audienceType ? { audienceType: query.audienceType } : {}),
                ...(query.departmentId ? { departmentId: query.departmentId } : {}),
              },
            },
          }
        : {};

    const where: Prisma.NoticeWhereInput = canPublish
      ? {
          organizationId,
          ...(query.status ? { status: query.status } : {}),
          ...audienceFilter,
          ...searchFilter,
        }
      : {
          organizationId,
          status: NoticeStatus.PUBLISHED,
          ...this.buildPublishedAudienceWhere(staffContext),
          ...searchFilter,
        };

    const [items, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        include: noticeInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notice.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(
    organizationId: string,
    noticeId: string,
    actor: AuthenticatedUser,
    canPublish: boolean,
  ): Promise<NoticeWithRelations> {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, organizationId },
      include: {
        ...noticeInclude,
        reads: {
          where: { userId: actor.userId },
          take: 1,
        },
      },
    });

    if (!notice) {
      throw new NotFoundException({
        code: NOTICE_ERROR_CODES.NOTICE_NOT_FOUND,
        message: 'Notice not found',
      });
    }

    await this.assertCanViewNotice(notice, actor, canPublish);

    return notice;
  }

  async update(
    organizationId: string,
    noticeId: string,
    dto: UpdateNoticeDto,
  ): Promise<NoticeWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const notice = await this.lockNoticeForMutation(tx, organizationId, noticeId);

      if (!isEditableNoticeStatus(notice.status)) {
        throw new ConflictException({
          code: NOTICE_ERROR_CODES.NOTICE_NOT_EDITABLE,
          message: `Notice cannot be edited in ${notice.status} status`,
        });
      }

      if (dto.audiences) {
        await this.validateAudiences(tx, organizationId, dto.audiences);
        await tx.noticeAudience.deleteMany({
          where: { organizationId, noticeId },
        });
        await tx.noticeAudience.createMany({
          data: dto.audiences.map((audience) => ({
            organizationId,
            noticeId,
            audienceType: audience.audienceType,
            departmentId:
              audience.audienceType === NoticeAudienceType.DEPARTMENT
                ? audience.departmentId ?? null
                : null,
          })),
        });
      }

      if (dto.attachmentFileIds !== undefined) {
        await this.assertNoticeAttachmentFiles(tx, organizationId, dto.attachmentFileIds);
        await tx.noticeAttachment.deleteMany({
          where: { organizationId, noticeId },
        });
        if (dto.attachmentFileIds.length > 0) {
          await tx.noticeAttachment.createMany({
            data: dto.attachmentFileIds.map((fileId) => ({
              organizationId,
              noticeId,
              fileId,
            })),
          });
        }
      }

      const nextStatus =
        dto.scheduledAt !== undefined
          ? resolveStatusAfterScheduleChange(notice.status, dto.scheduledAt)
          : notice.status;

      return tx.notice.update({
        where: { id: noticeId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
          ...(dto.scheduledAt !== undefined ? { scheduledAt: dto.scheduledAt } : {}),
          status: nextStatus,
        },
        include: noticeInclude,
      });
    });
  }

  async publish(organizationId: string, noticeId: string): Promise<NoticeWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const notice = await this.lockNoticeForMutation(tx, organizationId, noticeId);
      const now = new Date();

      if (!canPublishNotice(notice.status, notice.scheduledAt, now)) {
        throw new ConflictException({
          code: NOTICE_ERROR_CODES.INVALID_NOTICE_STATE,
          message:
            notice.status === NoticeStatus.SCHEDULED
              ? 'Scheduled notice cannot be published before its scheduled time'
              : `Notice cannot be published from ${notice.status} status`,
        });
      }

      return tx.notice.update({
        where: { id: noticeId },
        data: {
          status: NoticeStatus.PUBLISHED,
          publishedAt: now,
        },
        include: noticeInclude,
      });
    }).then((notice) => {
      void this.noticeNotificationService
        .notifyPublished(organizationId, noticeId)
        .catch(() => undefined);
      return notice;
    });
  }

  async archive(organizationId: string, noticeId: string): Promise<NoticeWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const notice = await this.lockNoticeForMutation(tx, organizationId, noticeId);

      if (notice.status !== NoticeStatus.PUBLISHED) {
        throw new ConflictException({
          code: NOTICE_ERROR_CODES.INVALID_NOTICE_STATE,
          message: 'Only published notices can be archived',
        });
      }

      const now = new Date();

      return tx.notice.update({
        where: { id: noticeId },
        data: {
          status: NoticeStatus.ARCHIVED,
          archivedAt: now,
        },
        include: noticeInclude,
      });
    });
  }

  async markRead(
    organizationId: string,
    noticeId: string,
    actor: AuthenticatedUser,
  ): Promise<NoticeWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await this.getPublishedNoticeForRecipient(tx, organizationId, noticeId, actor);
      const now = new Date();

      await tx.noticeRead.upsert({
        where: {
          organizationId_noticeId_userId: {
            organizationId,
            noticeId,
            userId: actor.userId,
          },
        },
        create: {
          organizationId,
          noticeId,
          userId: actor.userId,
          readAt: now,
        },
        update: {},
      });

      return this.reloadNoticeDetail(tx, organizationId, noticeId, actor.userId);
    });
  }

  async acknowledge(
    organizationId: string,
    noticeId: string,
    actor: AuthenticatedUser,
  ): Promise<NoticeWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await this.getPublishedNoticeForRecipient(tx, organizationId, noticeId, actor);
      const now = new Date();
      const readKey = {
        organizationId_noticeId_userId: {
          organizationId,
          noticeId,
          userId: actor.userId,
        },
      };

      const existingRead = await tx.noticeRead.findUnique({
        where: readKey,
      });

      if (existingRead?.acknowledgedAt) {
        return this.reloadNoticeDetail(tx, organizationId, noticeId, actor.userId);
      }

      await tx.noticeRead.upsert({
        where: readKey,
        create: {
          organizationId,
          noticeId,
          userId: actor.userId,
          readAt: now,
          acknowledgedAt: now,
        },
        update: {
          acknowledgedAt: now,
        },
      });

      return this.reloadNoticeDetail(tx, organizationId, noticeId, actor.userId);
    });
  }

  toDto(notice: NoticeWithRelations) {
    const read = notice.reads?.[0];

    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      status: notice.status,
      scheduledAt: notice.scheduledAt?.toISOString() ?? null,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
      archivedAt: notice.archivedAt?.toISOString() ?? null,
      createdByUserId: notice.createdByUserId,
      createdAt: notice.createdAt.toISOString(),
      updatedAt: notice.updatedAt.toISOString(),
      createdBy: notice.createdBy,
      audiences: notice.audiences.map((audience) => ({
        id: audience.id,
        audienceType: audience.audienceType,
        departmentId: audience.departmentId,
        department: audience.department,
      })),
      attachments: notice.attachments?.map((attachment) => ({
        id: attachment.id,
        fileId: attachment.fileId,
        file: {
          id: attachment.file.id,
          originalName: attachment.file.originalName,
          mimeType: attachment.file.mimeType,
          size: attachment.file.size,
          createdAt: attachment.file.createdAt.toISOString(),
        },
      })) ?? [],
      readState: read
        ? {
            readAt: read.readAt.toISOString(),
            acknowledgedAt: read.acknowledgedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  private async getPublishedNoticeForRecipient(
    tx: Prisma.TransactionClient,
    organizationId: string,
    noticeId: string,
    actor: AuthenticatedUser,
  ) {
    const lockedNotice = await this.lockNoticeForMutation(tx, organizationId, noticeId);

    if (lockedNotice.status !== NoticeStatus.PUBLISHED) {
      throw new ConflictException({
        code: NOTICE_ERROR_CODES.NOTICE_NOT_PUBLISHED,
        message: 'Notice must be published before it can be read or acknowledged',
      });
    }

    const notice = await tx.notice.findFirstOrThrow({
      where: { id: noticeId, organizationId },
      include: noticeInclude,
    });

    const audienceContext = await this.getAudienceContext(organizationId, actor.userId, tx);
    if (!userMatchesAudiences(notice.audiences, audienceContext)) {
      throw new NotFoundException({
        code: NOTICE_ERROR_CODES.NOT_IN_AUDIENCE,
        message: 'Notice not found',
      });
    }

    return notice;
  }

  private async assertCanViewNotice(
    notice: NoticeWithRelations,
    actor: AuthenticatedUser,
    canPublish: boolean,
  ): Promise<void> {
    if (canPublish) {
      return;
    }

    if (notice.status === NoticeStatus.PUBLISHED) {
      const audienceContext = await this.getAudienceContext(notice.organizationId, actor.userId);
      if (!userMatchesAudiences(notice.audiences, audienceContext)) {
        throw new NotFoundException({
          code: NOTICE_ERROR_CODES.NOTICE_NOT_FOUND,
          message: 'Notice not found',
        });
      }
      return;
    }

    if (
      (notice.status === NoticeStatus.DRAFT || notice.status === NoticeStatus.SCHEDULED) &&
      notice.createdByUserId === actor.userId
    ) {
      return;
    }

    throw new NotFoundException({
      code: NOTICE_ERROR_CODES.NOTICE_NOT_FOUND,
      message: 'Notice not found',
    });
  }

  private buildPublishedAudienceWhere(
    audienceContext: NoticeRecipientAudienceContext,
  ): Prisma.NoticeWhereInput {
    const audienceMatch: Prisma.NoticeWhereInput[] = [
      { audiences: { some: { audienceType: NoticeAudienceType.ENTIRE_SCHOOL } } },
    ];

    if (audienceContext.hasStaffProfile) {
      audienceMatch.push({ audiences: { some: { audienceType: NoticeAudienceType.STAFF } } });

      if (audienceContext.departmentId) {
        audienceMatch.push({
          audiences: {
            some: {
              audienceType: NoticeAudienceType.DEPARTMENT,
              departmentId: audienceContext.departmentId,
            },
          },
        });
      }
    }

    if (audienceContext.hasStudentProfile) {
      audienceMatch.push({ audiences: { some: { audienceType: NoticeAudienceType.STUDENT } } });
    }

    if (audienceContext.hasParentLink) {
      audienceMatch.push({ audiences: { some: { audienceType: NoticeAudienceType.PARENT } } });
    }

    return { OR: audienceMatch };
  }

  private async getAudienceContext(
    organizationId: string,
    userId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<NoticeRecipientAudienceContext> {
    const [staff, student, parentLink] = await Promise.all([
      tx.staff.findFirst({
        where: {
          organizationId,
          userId,
          employmentStatus: { not: EmploymentStatus.OFFBOARDED },
        },
        select: { departmentId: true },
      }),
      tx.student.findFirst({
        where: {
          organizationId,
          userId,
          status: StudentStatus.ACTIVE,
        },
        select: { id: true },
      }),
      tx.parentStudentLink.findFirst({
        where: { organizationId, parentUserId: userId },
        select: { id: true },
      }),
    ]);

    return {
      hasStaffProfile: Boolean(staff),
      hasStudentProfile: Boolean(student),
      hasParentLink: Boolean(parentLink),
      departmentId: staff?.departmentId ?? null,
    };
  }

  private async assertNoticeAttachmentFiles(
    tx: Prisma.TransactionClient,
    organizationId: string,
    fileIds: string[],
  ): Promise<void> {
    if (fileIds.length > 10) {
      throw new BadRequestException({
        code: NOTICE_ERROR_CODES.TOO_MANY_ATTACHMENTS,
        message: 'A notice can have at most 10 attachments',
      });
    }

    const uniqueIds = [...new Set(fileIds)];
    if (uniqueIds.length !== fileIds.length) {
      throw new BadRequestException({
        code: NOTICE_ERROR_CODES.INVALID_ATTACHMENT,
        message: 'Duplicate attachment file ids are not allowed',
      });
    }

    const files = await tx.file.findMany({
      where: { organizationId, id: { in: uniqueIds } },
      select: { id: true, mimeType: true },
    });

    if (files.length !== uniqueIds.length) {
      throw new BadRequestException({
        code: NOTICE_ERROR_CODES.INVALID_ATTACHMENT,
        message: 'One or more attachment files were not found in this organization',
      });
    }

    for (const file of files) {
      if (!file.mimeType.startsWith('image/') && file.mimeType !== 'application/pdf') {
        throw new BadRequestException({
          code: NOTICE_ERROR_CODES.INVALID_ATTACHMENT,
          message: 'Notice attachments must be images or PDF documents',
        });
      }
    }
  }

  private async validateAudiences(
    tx: Prisma.TransactionClient,
    organizationId: string,
    audiences: NoticeAudienceInputDto[],
  ): Promise<void> {
    if (!audiences.length) {
      throw new BadRequestException({
        code: NOTICE_ERROR_CODES.AUDIENCE_REQUIRED,
        message: 'At least one audience is required',
      });
    }

    for (const audience of audiences) {
      if (audience.audienceType === NoticeAudienceType.DEPARTMENT) {
        if (!audience.departmentId) {
          throw new BadRequestException({
            code: NOTICE_ERROR_CODES.DEPARTMENT_REQUIRED,
            message: 'Department is required for department audience',
          });
        }

        await this.assertActiveDepartment(tx, organizationId, audience.departmentId);
      } else if (audience.departmentId) {
        throw new BadRequestException({
          code: NOTICE_ERROR_CODES.DEPARTMENT_NOT_ALLOWED,
          message: `Department must not be supplied for ${audience.audienceType} audience`,
        });
      }
    }
  }

  private async assertActiveDepartment(
    tx: Prisma.TransactionClient,
    organizationId: string,
    departmentId: string,
  ): Promise<void> {
    const department = await tx.department.findFirst({
      where: { id: departmentId, organizationId },
    });

    if (!department) {
      throw new BadRequestException({
        code: NOTICE_ERROR_CODES.INVALID_DEPARTMENT,
        message: 'Department does not belong to this organization',
      });
    }

    if (department.status !== DepartmentStatus.ACTIVE) {
      throw new BadRequestException({
        code: NOTICE_ERROR_CODES.INVALID_DEPARTMENT,
        message: 'Department must be active',
      });
    }
  }

  private async reloadNoticeDetail(
    tx: Prisma.TransactionClient,
    organizationId: string,
    noticeId: string,
    userId?: string,
  ): Promise<NoticeWithRelations> {
    return tx.notice.findFirstOrThrow({
      where: { id: noticeId, organizationId },
      include: {
        ...noticeInclude,
        ...(userId
          ? {
              reads: {
                where: { userId },
                take: 1,
              },
            }
          : {}),
      },
    });
  }

  async publishDueScheduledNotices(): Promise<{ published: number; checkedAt: string }> {
    const now = new Date();
    const due = await this.prisma.notice.findMany({
      where: {
        status: NoticeStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      select: { id: true, organizationId: true },
      take: 100,
    });

    let published = 0;
    for (const notice of due) {
      try {
        await this.publish(notice.organizationId, notice.id);
        published += 1;
      } catch {
        // Skip rows that fail state checks; next cron run can retry.
      }
    }

    return { published, checkedAt: now.toISOString() };
  }

  private async lockNoticeForMutation(
    tx: Prisma.TransactionClient,
    organizationId: string,
    noticeId: string,
  ): Promise<Notice> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Notice"
      WHERE id = ${noticeId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new NotFoundException({
        code: NOTICE_ERROR_CODES.NOTICE_NOT_FOUND,
        message: 'Notice not found',
      });
    }

    return tx.notice.findFirstOrThrow({
      where: { id: noticeId, organizationId },
    });
  }
}
