import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import QRCode from 'qrcode';
import {
  EmploymentStatus,
  Prisma,
  Visitor,
  VisitorHistory,
  VisitorHistoryEvent,
  VisitorStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { buildOrganizationBlock, formatDocumentDateTime } from '../documents/utils/document-format.util';
import { VISITOR_ERROR_CODES } from './constants/visitor.constants';
import { CreateVisitorDto } from './dto/visitor.dto';
import { ListVisitorsQueryDto } from './dto/list-visitors-query.dto';
import {
  formatVisitorCode,
  parseVisitorCodeSequence,
} from './utils/visitor-code.util';
import {
  buildCheckInDateRange,
  buildCheckInEndExclusive,
  parseVisitorDate,
} from './utils/visitor-date.util';
import { VisitorNotificationService } from './visitor-notification.service';

const staffSummarySelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  displayName: true,
} as const;

const userSummarySelect = {
  id: true,
  email: true,
} as const;

const visitorInclude = {
  hostStaff: { select: staffSummarySelect },
  createdBy: { select: userSummarySelect },
} as const;

const visitorDetailInclude = {
  ...visitorInclude,
  history: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      actorUser: { select: userSummarySelect },
    },
  },
} as const;

type VisitorWithRelations = Visitor & {
  hostStaff: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
  };
  createdBy: { id: string; email: string };
};

type VisitorDetail = VisitorWithRelations & {
  history: Array<
    VisitorHistory & {
      actorUser: { id: string; email: string };
    }
  >;
};

@Injectable()
export class VisitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visitorNotificationService: VisitorNotificationService,
  ) {}

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateVisitorDto,
  ): Promise<VisitorDetail> {
    const visitor = await this.prisma.$transaction(async (tx) => {
      await this.assertActiveHostStaff(tx, organizationId, dto.hostStaffId);
      if (dto.photoFileId) {
        await this.assertVisitorPhotoFile(tx, organizationId, dto.photoFileId);
      }

      const visitorCode = await this.generateVisitorCode(tx, organizationId);
      const checkInAt = new Date();

      const visitor = await tx.visitor.create({
        data: {
          organizationId,
          visitorCode,
          name: dto.name.trim(),
          mobile: dto.mobile.trim(),
          organizationName: dto.organizationName?.trim() || null,
          vehicleNumber: dto.vehicleNumber?.trim() || null,
          purpose: dto.purpose.trim(),
          hostStaffId: dto.hostStaffId,
          checkInAt,
          status: VisitorStatus.CHECKED_IN,
          remarks: dto.remarks?.trim() || null,
          photoFileId: dto.photoFileId ?? null,
          createdByUserId: actor.userId,
        },
        include: visitorDetailInclude,
      });

      await tx.visitorHistory.create({
        data: {
          organizationId,
          visitorId: visitor.id,
          eventType: VisitorHistoryEvent.CHECKED_IN,
          actorUserId: actor.userId,
          comment: 'Visitor checked in',
        },
      });

      return this.reloadVisitorDetail(tx, organizationId, visitor.id);
    });

    void this.visitorNotificationService
      .notifyHostOnCheckIn(organizationId, visitor.id)
      .catch(() => undefined);

    return visitor;
  }

  async lookupByMobile(organizationId: string, mobile: string) {
    const trimmed = mobile.trim();
    const visitor = await this.prisma.visitor.findFirst({
      where: { organizationId, mobile: trimmed },
      orderBy: { checkInAt: 'desc' },
      select: {
        name: true,
        mobile: true,
        organizationName: true,
        vehicleNumber: true,
        photoFileId: true,
        hostStaffId: true,
        checkInAt: true,
      },
    });

    if (!visitor) {
      return null;
    }

    return {
      name: visitor.name,
      mobile: visitor.mobile,
      organizationName: visitor.organizationName,
      vehicleNumber: visitor.vehicleNumber,
      photoFileId: visitor.photoFileId,
      hostStaffId: visitor.hostStaffId,
      lastVisitAt: visitor.checkInAt.toISOString(),
    };
  }

  async listActiveHostStaff(organizationId: string) {
    const staff = await this.prisma.staff.findMany({
      where: {
        organizationId,
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      select: staffSummarySelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return staff;
  }

  async list(organizationId: string, query: ListVisitorsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const searchTerm = query.search?.trim();

    const where: Prisma.VisitorWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.hostStaffId ? { hostStaffId: query.hostStaffId } : {}),
      ...this.buildCheckInDateFilter(query),
      ...(searchTerm
        ? {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { mobile: { contains: searchTerm, mode: 'insensitive' } },
              { visitorCode: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.visitor.findMany({
        where,
        include: visitorInclude,
        orderBy: { checkInAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.visitor.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  }

  async findById(organizationId: string, visitorId: string): Promise<VisitorDetail> {
    const visitor = await this.prisma.visitor.findFirst({
      where: { id: visitorId, organizationId },
      include: visitorDetailInclude,
    });

    if (!visitor) {
      throw new NotFoundException({
        code: VISITOR_ERROR_CODES.VISITOR_NOT_FOUND,
        message: 'Visitor not found',
      });
    }

    return visitor;
  }

  async getVisitorPass(organizationId: string, visitorId: string) {
    const visitor = await this.findById(organizationId, visitorId);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: VISITOR_ERROR_CODES.VISITOR_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    const checkInTimestamp = visitor.checkInAt.toISOString();
    const qrPayload = `CAMPUSOPS-VISITOR-${visitor.id}-${checkInTimestamp}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
    });

    const hostName = visitor.hostStaff.displayName?.trim()
      ? visitor.hostStaff.displayName.trim()
      : `${visitor.hostStaff.firstName} ${visitor.hostStaff.lastName}`.trim();

    const organizationBlock = buildOrganizationBlock(organization, organization.settings);

    return {
      visitor: {
        visitorCode: visitor.visitorCode,
        name: visitor.name,
        mobile: visitor.mobile,
        organization: visitor.organizationName,
        purpose: visitor.purpose,
        host: hostName,
        checkInTime: formatDocumentDateTime(visitor.checkInAt),
        vehicleNumber: visitor.vehicleNumber,
        photoFileId: visitor.photoFileId,
      },
      organization: {
        name: organizationBlock.name,
        city: organizationBlock.city,
      },
      qrCodeDataUrl,
      passGeneratedAt: new Date().toISOString(),
    };
  }

  async listHistory(organizationId: string, visitorId: string) {
    const visitor = await this.prisma.visitor.findFirst({
      where: { id: visitorId, organizationId },
      select: { id: true },
    });

    if (!visitor) {
      throw new NotFoundException({
        code: VISITOR_ERROR_CODES.VISITOR_NOT_FOUND,
        message: 'Visitor not found',
      });
    }

    const history = await this.prisma.visitorHistory.findMany({
      where: { organizationId, visitorId },
      include: {
        actorUser: { select: userSummarySelect },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: history.map((entry) => this.toHistoryDto(entry)),
    };
  }

  async checkOut(
    organizationId: string,
    visitorId: string,
    actor: AuthenticatedUser,
  ): Promise<VisitorDetail> {
    return this.prisma.$transaction(async (tx) => {
      const visitor = await this.lockVisitorForMutation(tx, organizationId, visitorId, [
        VisitorStatus.CHECKED_IN,
      ]);

      const checkOutAt = new Date();

      await tx.visitor.update({
        where: { id: visitor.id },
        data: {
          status: VisitorStatus.CHECKED_OUT,
          checkOutAt,
        },
      });

      await tx.visitorHistory.create({
        data: {
          organizationId,
          visitorId: visitor.id,
          eventType: VisitorHistoryEvent.CHECKED_OUT,
          actorUserId: actor.userId,
          comment: 'Visitor checked out',
        },
      });

      return this.reloadVisitorDetail(tx, organizationId, visitor.id);
    });
  }

  toDto(
    visitor: VisitorWithRelations | VisitorDetail,
    options?: { includeHistory?: boolean },
  ) {
    const includeHistory = options?.includeHistory ?? 'history' in visitor;

    return {
      id: visitor.id,
      visitorCode: visitor.visitorCode,
      name: visitor.name,
      mobile: visitor.mobile,
      organizationName: visitor.organizationName,
      vehicleNumber: visitor.vehicleNumber,
      purpose: visitor.purpose,
      hostStaffId: visitor.hostStaffId,
      checkInAt: visitor.checkInAt.toISOString(),
      checkOutAt: visitor.checkOutAt?.toISOString() ?? null,
      status: visitor.status,
      remarks: visitor.remarks,
      photoFileId: visitor.photoFileId,
      createdByUserId: visitor.createdByUserId,
      createdAt: visitor.createdAt.toISOString(),
      updatedAt: visitor.updatedAt.toISOString(),
      hostStaff: visitor.hostStaff,
      createdBy: visitor.createdBy,
      ...(includeHistory && 'history' in visitor
        ? {
            history: visitor.history.map((entry) => this.toHistoryDto(entry)),
          }
        : {}),
    };
  }

  private toHistoryDto(
    entry: VisitorHistory & { actorUser?: { id: string; email: string } },
  ) {
    return {
      id: entry.id,
      eventType: entry.eventType,
      comment: entry.comment,
      createdAt: entry.createdAt.toISOString(),
      ...(entry.actorUser ? { actorUser: entry.actorUser } : {}),
    };
  }

  private buildCheckInDateFilter(
    query: ListVisitorsQueryDto,
  ): Pick<Prisma.VisitorWhereInput, 'checkInAt'> | Record<string, never> {
    if (query.date) {
      const date = parseVisitorDate(query.date);
      const range = buildCheckInDateRange(date);
      return { checkInAt: range };
    }

    if (query.fromDate || query.toDate) {
      const filter: Prisma.DateTimeFilter = {};

      if (query.fromDate) {
        filter.gte = parseVisitorDate(query.fromDate);
      }

      if (query.toDate) {
        filter.lt = buildCheckInEndExclusive(parseVisitorDate(query.toDate));
      }

      return { checkInAt: filter };
    }

    return {};
  }

  private async generateVisitorCode(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<string> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':visitor'))`;

    const existingCodes = await tx.visitor.findMany({
      where: {
        organizationId,
        visitorCode: { startsWith: 'VIS-' },
      },
      select: { visitorCode: true },
    });

    const maxSequence = existingCodes.reduce((max, item) => {
      const sequence = parseVisitorCodeSequence(item.visitorCode);
      return sequence !== null && sequence > max ? sequence : max;
    }, 0);

    return formatVisitorCode(maxSequence + 1);
  }

  private async reloadVisitorDetail(
    tx: Prisma.TransactionClient,
    organizationId: string,
    visitorId: string,
  ): Promise<VisitorDetail> {
    return tx.visitor.findFirstOrThrow({
      where: { id: visitorId, organizationId },
      include: visitorDetailInclude,
    });
  }

  private async lockVisitorForMutation(
    tx: Prisma.TransactionClient,
    organizationId: string,
    visitorId: string,
    allowedStatuses?: VisitorStatus[],
  ): Promise<Visitor> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Visitor"
      WHERE id = ${visitorId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new NotFoundException({
        code: VISITOR_ERROR_CODES.VISITOR_NOT_FOUND,
        message: 'Visitor not found',
      });
    }

    const visitor = await tx.visitor.findFirstOrThrow({
      where: { id: visitorId, organizationId },
    });

    if (visitor.status === VisitorStatus.CHECKED_OUT) {
      throw new ConflictException({
        code: VISITOR_ERROR_CODES.VISITOR_ALREADY_CHECKED_OUT,
        message: 'Visitor is already checked out',
      });
    }

    if (allowedStatuses && !allowedStatuses.includes(visitor.status)) {
      throw new ConflictException({
        code: VISITOR_ERROR_CODES.VISITOR_CHECKOUT_CONFLICT,
        message: `Visitor cannot be checked out in ${visitor.status} status`,
      });
    }

    return visitor;
  }

  private async assertActiveHostStaff(
    tx: Prisma.TransactionClient,
    organizationId: string,
    staffId: string,
  ): Promise<void> {
    const staff = await tx.staff.findFirst({
      where: { id: staffId, organizationId },
    });

    if (!staff) {
      throw new BadRequestException({
        code: VISITOR_ERROR_CODES.VISITOR_HOST_INVALID,
        message: 'Host staff does not belong to this organization',
      });
    }

    if (staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: VISITOR_ERROR_CODES.VISITOR_HOST_OFFBOARDED,
        message: 'Offboarded staff cannot host visitors',
      });
    }

    if (staff.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new BadRequestException({
        code: VISITOR_ERROR_CODES.VISITOR_HOST_INACTIVE,
        message: 'Inactive staff cannot host visitors',
      });
    }
  }

  private async assertVisitorPhotoFile(
    tx: Prisma.TransactionClient,
    organizationId: string,
    fileId: string,
  ): Promise<void> {
    const file = await tx.file.findFirst({
      where: { id: fileId, organizationId },
    });

    if (!file) {
      throw new BadRequestException({
        code: VISITOR_ERROR_CODES.VISITOR_NOT_FOUND,
        message: 'Visitor photo file was not found in this organization',
      });
    }

    if (!file.mimeType.startsWith('image/')) {
      throw new BadRequestException({
        code: VISITOR_ERROR_CODES.VISITOR_NOT_FOUND,
        message: 'Visitor photo must be an image',
      });
    }
  }
}
