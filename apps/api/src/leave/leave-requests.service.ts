import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmploymentStatus,
  LeaveRequest,
  LeaveRequestStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LEAVE_ERROR_CODES } from './constants/leave.constants';
import { CreateLeaveRequestDto, ListLeaveRequestsQueryDto } from './dto/leave-request.dto';
import { LeaveTypesService } from './leave-types.service';
import {
  calculateAvailableBalance,
  calculateLeaveDuration,
  datesOverlap,
  decimalToNumber,
  formatLeaveDate,
  parseLeaveDate,
} from './utils/leave.util';

type LeaveRequestWithRelations = LeaveRequest & {
  staff: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    userId: string | null;
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
  };
};

const requestInclude = {
  staff: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      displayName: true,
      userId: true,
    },
  },
  leaveType: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} as const;

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveTypesService: LeaveTypesService,
  ) {}

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateLeaveRequestDto,
    canSubmitForOthers: boolean,
  ): Promise<LeaveRequestWithRelations> {
    const startDate = parseLeaveDate(dto.startDate);
    const endDate = parseLeaveDate(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'End date cannot be before start date',
      });
    }

    await this.assertStaffEligible(organizationId, dto.staffId);
    await this.assertSubmissionScope(organizationId, actor, dto.staffId, canSubmitForOthers);

    const leaveType = await this.leaveTypesService.assertActiveLeaveType(
      organizationId,
      dto.leaveTypeId,
    );

    const isHalfDay = Boolean(dto.halfDayPart);
    if (isHalfDay) {
      if (!leaveType.allowsHalfDay) {
        throw new BadRequestException({
          code: LEAVE_ERROR_CODES.HALF_DAY_NOT_ALLOWED,
          message: 'Half-day leave is not allowed for this leave type',
        });
      }

      if (startDate.getTime() !== endDate.getTime()) {
        throw new BadRequestException({
          code: LEAVE_ERROR_CODES.INVALID_HALF_DAY,
          message: 'Half-day leave must use the same start and end date',
        });
      }
    }

    if (leaveType.requiresReason && !dto.reason?.trim()) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.REASON_REQUIRED,
        message: 'Reason is required for this leave type',
      });
    }

    const duration = calculateLeaveDuration({ startDate, endDate, isHalfDay });
    if (duration <= 0) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.INVALID_DURATION,
        message: 'Leave duration must be greater than zero',
      });
    }

    await this.assertNoOverlap(organizationId, dto.staffId, startDate, endDate);

    return this.prisma.leaveRequest.create({
      data: {
        organizationId,
        staffId: dto.staffId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        duration,
        halfDayPart: dto.halfDayPart ?? null,
        reason: dto.reason?.trim() || null,
        status: LeaveRequestStatus.PENDING_APPROVAL,
        submittedAt: new Date(),
      },
      include: requestInclude,
    });
  }

  async list(organizationId: string, query: ListLeaveRequestsQueryDto) {
    const where: Prisma.LeaveRequestWhereInput = {
      organizationId,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: requestInclude,
        orderBy: [{ submittedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, requestId: string): Promise<LeaveRequestWithRelations> {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: requestInclude,
    });

    if (!request) {
      throw new NotFoundException({
        code: LEAVE_ERROR_CODES.LEAVE_REQUEST_NOT_FOUND,
        message: 'Leave request not found',
      });
    }

    return request;
  }

  async approve(
    organizationId: string,
    requestId: string,
    approver: AuthenticatedUser,
  ): Promise<LeaveRequestWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.lockPendingLeaveRequest(tx, organizationId, requestId);

      this.assertNotSelfApproval(request.staff.userId, approver.userId);

      if (request.leaveType.tracksBalance) {
        const balance = await tx.leaveBalance.findFirst({
          where: {
            organizationId,
            staffId: request.staffId,
            leaveTypeId: request.leaveTypeId,
            periodStart: { lte: request.startDate },
            periodEnd: { gte: request.startDate },
          },
        });

        if (!balance) {
          throw new BadRequestException({
            code: LEAVE_ERROR_CODES.INSUFFICIENT_LEAVE_BALANCE,
            message: 'No leave balance is configured for this request period',
          });
        }

        await tx.$executeRaw`SELECT id FROM "LeaveBalance" WHERE id = ${balance.id}::uuid FOR UPDATE`;

        const lockedBalance = await tx.leaveBalance.findUniqueOrThrow({
          where: { id: balance.id },
        });
        const available = calculateAvailableBalance(lockedBalance);
        const requestedDays = decimalToNumber(request.duration);

        if (available < requestedDays) {
          throw new BadRequestException({
            code: LEAVE_ERROR_CODES.INSUFFICIENT_LEAVE_BALANCE,
            message: 'Insufficient leave balance',
          });
        }

        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            usedAmount: {
              increment: request.duration,
            },
          },
        });
      }

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: LeaveRequestStatus.APPROVED,
          decidedAt: new Date(),
          decidedByUserId: approver.userId,
        },
        include: requestInclude,
      });
    });
  }

  async reject(
    organizationId: string,
    requestId: string,
    approver: AuthenticatedUser,
  ): Promise<LeaveRequestWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.lockPendingLeaveRequest(tx, organizationId, requestId);

      this.assertNotSelfApproval(request.staff.userId, approver.userId);

      return tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: LeaveRequestStatus.REJECTED,
          decidedAt: new Date(),
          decidedByUserId: approver.userId,
        },
        include: requestInclude,
      });
    });
  }

  toDto(request: LeaveRequestWithRelations) {
    return {
      id: request.id,
      organizationId: request.organizationId,
      staffId: request.staffId,
      leaveTypeId: request.leaveTypeId,
      startDate: formatLeaveDate(request.startDate),
      endDate: formatLeaveDate(request.endDate),
      duration: decimalToNumber(request.duration),
      halfDayPart: request.halfDayPart,
      reason: request.reason,
      status: request.status,
      submittedAt: request.submittedAt.toISOString(),
      decidedAt: request.decidedAt?.toISOString() ?? null,
      decidedByUserId: request.decidedByUserId,
      staff: request.staff,
      leaveType: request.leaveType,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private async assertStaffEligible(organizationId: string, staffId: string): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, organizationId },
    });

    if (!staff) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.INVALID_STAFF,
        message: 'Staff member does not belong to this organization',
      });
    }

    if (staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.STAFF_NOT_ELIGIBLE,
        message: 'Leave cannot be submitted for offboarded staff',
      });
    }
  }

  private async assertSubmissionScope(
    organizationId: string,
    actor: AuthenticatedUser,
    staffId: string,
    canSubmitForOthers: boolean,
  ): Promise<void> {
    if (canSubmitForOthers) {
      return;
    }

    const actorStaff = await this.prisma.staff.findFirst({
      where: { organizationId, userId: actor.userId },
    });

    if (!actorStaff || actorStaff.id !== staffId) {
      throw new ForbiddenException({
        code: LEAVE_ERROR_CODES.FORBIDDEN_LEAVE_SUBMISSION,
        message: 'You can only submit leave for your own staff profile',
      });
    }
  }

  private async assertNoOverlap(
    organizationId: string,
    staffId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const existingRequests = await this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        staffId,
        status: {
          in: [LeaveRequestStatus.PENDING_APPROVAL, LeaveRequestStatus.APPROVED],
        },
      },
    });

    const hasOverlap = existingRequests.some((request) =>
      datesOverlap(request.startDate, request.endDate, startDate, endDate),
    );

    if (hasOverlap) {
      throw new ConflictException({
        code: LEAVE_ERROR_CODES.OVERLAPPING_LEAVE,
        message: 'Leave request overlaps with an existing pending or approved request',
      });
    }
  }

  private assertNotSelfApproval(
    requesterUserId: string | null | undefined,
    approverUserId: string,
  ): void {
    if (requesterUserId && requesterUserId === approverUserId) {
      throw new ForbiddenException({
        code: LEAVE_ERROR_CODES.SELF_APPROVAL_NOT_ALLOWED,
        message: 'You cannot approve or reject your own leave request',
      });
    }
  }

  private async lockPendingLeaveRequest(
    tx: Prisma.TransactionClient,
    organizationId: string,
    requestId: string,
  ): Promise<
    LeaveRequest & {
      staff: { userId: string | null };
      leaveType: LeaveRequestWithRelations['leaveType'] & { tracksBalance: boolean };
    }
  > {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "LeaveRequest"
      WHERE id = ${requestId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND status = ${LeaveRequestStatus.PENDING_APPROVAL}::"LeaveRequestStatus"
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new ConflictException({
        code: LEAVE_ERROR_CODES.INVALID_LEAVE_STATE,
        message: 'Leave request is not pending approval',
      });
    }

    return tx.leaveRequest.findFirstOrThrow({
      where: { id: requestId, organizationId },
      include: {
        staff: { select: { userId: true } },
        leaveType: true,
      },
    });
  }
}
