import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Complaint,
  ComplaintHistory,
  ComplaintStatus,
  EmploymentStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ASSIGNABLE_COMPLAINT_STATUSES,
  COMPLAINT_ERROR_CODES,
} from './constants/complaint.constants';
import {
  AddComplaintCommentDto,
  AssignComplaintDto,
  ChangeComplaintStatusDto,
  CreateComplaintDto,
  UpdateComplaintDto,
} from './dto/complaint.dto';
import { ListComplaintsQueryDto } from './dto/list-complaints-query.dto';
import {
  formatComplaintCode,
  parseComplaintCodeSequence,
} from './utils/complaint-code.util';
import { isValidComplaintStatusTransition } from './utils/complaint-status.util';

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

const complaintInclude = {
  createdBy: { select: userSummarySelect },
  assignedToStaff: { select: staffSummarySelect },
} as const;

const complaintDetailInclude = {
  ...complaintInclude,
  history: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      actor: { select: userSummarySelect },
    },
  },
} as const;

type ComplaintWithRelations = Complaint & {
  createdBy: { id: string; email: string };
  assignedToStaff: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
  } | null;
};

type ComplaintDetail = ComplaintWithRelations & {
  history: Array<
    ComplaintHistory & {
      actor: { id: string; email: string };
    }
  >;
};

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateComplaintDto,
  ): Promise<ComplaintDetail> {
    return this.prisma.$transaction(async (tx) => {
      const complaintCode = await this.generateComplaintCode(tx, organizationId);

      const complaint = await tx.complaint.create({
        data: {
          organizationId,
          complaintCode,
          title: dto.title.trim(),
          description: dto.description.trim(),
          category: dto.category,
          priority: dto.priority,
          status: ComplaintStatus.OPEN,
          createdByUserId: actor.userId,
          location: dto.location?.trim() || null,
        },
        include: complaintDetailInclude,
      });

      await tx.complaintHistory.create({
        data: {
          organizationId,
          complaintId: complaint.id,
          actorUserId: actor.userId,
          oldStatus: null,
          newStatus: ComplaintStatus.OPEN,
          comment: 'Complaint created',
        },
      });

      return this.reloadComplaintDetail(tx, organizationId, complaint.id);
    });
  }

  async list(organizationId: string, query: ListComplaintsQueryDto) {
    const where: Prisma.ComplaintWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.assignedToStaffId ? { assignedToStaffId: query.assignedToStaffId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { complaintCode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        include: complaintInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, complaintId: string): Promise<ComplaintDetail> {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, organizationId },
      include: complaintDetailInclude,
    });

    if (!complaint) {
      throw new NotFoundException({
        code: COMPLAINT_ERROR_CODES.COMPLAINT_NOT_FOUND,
        message: 'Complaint not found',
      });
    }

    return complaint;
  }

  async update(
    organizationId: string,
    complaintId: string,
    dto: UpdateComplaintDto,
  ): Promise<ComplaintWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockComplaintForMutation(tx, organizationId, complaintId);

      return tx.complaint.update({
        where: { id: complaintId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.location !== undefined ? { location: dto.location.trim() || null } : {}),
        },
        include: complaintInclude,
      });
    });
  }

  async assign(
    organizationId: string,
    complaintId: string,
    actor: AuthenticatedUser,
    dto: AssignComplaintDto,
  ): Promise<ComplaintDetail> {
    await this.assertAssignableStaff(organizationId, dto.assignedToStaffId);

    return this.prisma.$transaction(async (tx) => {
      const complaint = await this.lockComplaintForMutation(
        tx,
        organizationId,
        complaintId,
        [...ASSIGNABLE_COMPLAINT_STATUSES],
      );

      const nextStatus =
        complaint.status === ComplaintStatus.OPEN
          ? ComplaintStatus.ASSIGNED
          : complaint.status;

      await tx.complaint.update({
        where: { id: complaintId },
        data: {
          assignedToStaffId: dto.assignedToStaffId,
          status: nextStatus,
        },
      });

      await tx.complaintHistory.create({
        data: {
          organizationId,
          complaintId,
          actorUserId: actor.userId,
          oldStatus: complaint.status,
          newStatus: nextStatus,
          comment:
            complaint.assignedToStaffId &&
            complaint.assignedToStaffId !== dto.assignedToStaffId
              ? 'Complaint reassigned'
              : 'Complaint assigned',
        },
      });

      return this.reloadComplaintDetail(tx, organizationId, complaintId);
    });
  }

  async changeStatus(
    organizationId: string,
    complaintId: string,
    actor: AuthenticatedUser,
    dto: ChangeComplaintStatusDto,
    canClose: boolean,
  ): Promise<ComplaintDetail> {
    if (dto.status === ComplaintStatus.CLOSED && !canClose) {
      throw new ForbiddenException({
        code: COMPLAINT_ERROR_CODES.FORBIDDEN_COMPLAINT_CLOSE,
        message: 'You do not have permission to close complaints',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const complaint = await this.lockComplaintForMutation(tx, organizationId, complaintId);

      if (
        complaint.status === ComplaintStatus.OPEN &&
        dto.status === ComplaintStatus.ASSIGNED
      ) {
        throw new ConflictException({
          code: COMPLAINT_ERROR_CODES.INVALID_COMPLAINT_STATE,
          message: 'OPEN complaints must be assigned through the assign endpoint.',
        });
      }

      if (!isValidComplaintStatusTransition(complaint.status, dto.status)) {
        throw new ConflictException({
          code: COMPLAINT_ERROR_CODES.INVALID_COMPLAINT_STATE,
          message: `Cannot transition complaint from ${complaint.status} to ${dto.status}`,
        });
      }

      await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: dto.status,
          ...(dto.status === ComplaintStatus.CLOSED ? { closedAt: new Date() } : {}),
        },
      });

      await tx.complaintHistory.create({
        data: {
          organizationId,
          complaintId,
          actorUserId: actor.userId,
          oldStatus: complaint.status,
          newStatus: dto.status,
          comment:
            dto.status === ComplaintStatus.CLOSED ? 'Complaint closed' : 'Status updated',
        },
      });

      return this.reloadComplaintDetail(tx, organizationId, complaintId);
    });
  }

  async addComment(
    organizationId: string,
    complaintId: string,
    actor: AuthenticatedUser,
    dto: AddComplaintCommentDto,
  ): Promise<ComplaintDetail> {
    return this.prisma.$transaction(async (tx) => {
      const complaint = await this.lockComplaintForMutation(tx, organizationId, complaintId);
      this.assertNotClosed(complaint.status);

      await tx.complaintHistory.create({
        data: {
          organizationId,
          complaintId,
          actorUserId: actor.userId,
          oldStatus: null,
          newStatus: null,
          comment: dto.comment.trim(),
        },
      });

      return this.reloadComplaintDetail(tx, organizationId, complaintId);
    });
  }

  toDto(complaint: ComplaintWithRelations | ComplaintDetail) {
    return {
      id: complaint.id,
      organizationId: complaint.organizationId,
      complaintCode: complaint.complaintCode,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      createdByUserId: complaint.createdByUserId,
      assignedToStaffId: complaint.assignedToStaffId,
      location: complaint.location,
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
      closedAt: complaint.closedAt?.toISOString() ?? null,
      createdBy: complaint.createdBy,
      assignedToStaff: complaint.assignedToStaff,
      ...('history' in complaint
        ? {
            history: complaint.history.map((entry) => ({
              id: entry.id,
              actorUserId: entry.actorUserId,
              oldStatus: entry.oldStatus,
              newStatus: entry.newStatus,
              comment: entry.comment,
              createdAt: entry.createdAt.toISOString(),
              actor: entry.actor,
            })),
          }
        : {}),
    };
  }

  private async generateComplaintCode(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<string> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;

    const existingCodes = await tx.complaint.findMany({
      where: {
        organizationId,
        complaintCode: { startsWith: 'cmp-' },
      },
      select: { complaintCode: true },
    });

    const maxSequence = existingCodes.reduce((max, item) => {
      const sequence = parseComplaintCodeSequence(item.complaintCode);
      return sequence !== null && sequence > max ? sequence : max;
    }, 0);

    return formatComplaintCode(maxSequence + 1);
  }

  private async reloadComplaintDetail(
    tx: Prisma.TransactionClient,
    organizationId: string,
    complaintId: string,
  ): Promise<ComplaintDetail> {
    return tx.complaint.findFirstOrThrow({
      where: { id: complaintId, organizationId },
      include: complaintDetailInclude,
    });
  }

  private async lockComplaintForMutation(
    tx: Prisma.TransactionClient,
    organizationId: string,
    complaintId: string,
    allowedStatuses?: ComplaintStatus[],
  ): Promise<Complaint> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Complaint"
      WHERE id = ${complaintId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new NotFoundException({
        code: COMPLAINT_ERROR_CODES.COMPLAINT_NOT_FOUND,
        message: 'Complaint not found',
      });
    }

    const complaint = await tx.complaint.findFirstOrThrow({
      where: { id: complaintId, organizationId },
    });

    if (complaint.status === ComplaintStatus.CLOSED) {
      throw new ConflictException({
        code: COMPLAINT_ERROR_CODES.COMPLAINT_CLOSED,
        message: 'Complaint is closed and cannot be modified',
      });
    }

    if (allowedStatuses && !allowedStatuses.includes(complaint.status)) {
      throw new ConflictException({
        code: COMPLAINT_ERROR_CODES.INVALID_COMPLAINT_STATE,
        message: `Complaint cannot be modified in ${complaint.status} status`,
      });
    }

    return complaint;
  }

  private async assertAssignableStaff(
    organizationId: string,
    staffId: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, organizationId },
    });

    if (!staff) {
      throw new BadRequestException({
        code: COMPLAINT_ERROR_CODES.INVALID_STAFF,
        message: 'Staff member does not belong to this organization',
      });
    }

    if (staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: COMPLAINT_ERROR_CODES.STAFF_NOT_ELIGIBLE,
        message: 'Offboarded staff cannot be assigned to complaints',
      });
    }
  }

  private assertNotClosed(status: ComplaintStatus): void {
    if (status === ComplaintStatus.CLOSED) {
      throw new ConflictException({
        code: COMPLAINT_ERROR_CODES.COMPLAINT_CLOSED,
        message: 'Complaint is closed and cannot be modified',
      });
    }
  }
}
