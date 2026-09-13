import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, LeaveBalance, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LEAVE_ERROR_CODES } from './constants/leave.constants';
import { CreateLeaveBalanceDto, ListLeaveBalancesQueryDto } from './dto/leave-balance.dto';
import { LeaveTypesService } from './leave-types.service';
import {
  calculateAvailableBalance,
  decimalToNumber,
  formatLeaveDate,
  parseLeaveDate,
} from './utils/leave.util';

@Injectable()
export class LeaveBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveTypesService: LeaveTypesService,
  ) {}

  async create(organizationId: string, dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const periodStart = parseLeaveDate(dto.periodStart);
    const periodEnd = parseLeaveDate(dto.periodEnd);

    if (periodEnd < periodStart) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'Period end cannot be before period start',
      });
    }

    await this.assertStaffInOrganization(organizationId, dto.staffId);
    await this.leaveTypesService.findById(organizationId, dto.leaveTypeId);

    const openingBalance = dto.openingBalance ?? 0;
    const adjustmentAmount = dto.adjustmentAmount ?? 0;

    if (openingBalance < 0 || dto.allocatedAmount < 0 || adjustmentAmount < 0) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.INVALID_BALANCE_AMOUNT,
        message: 'Balance amounts cannot be negative',
      });
    }

    try {
      return await this.prisma.leaveBalance.create({
        data: {
          organizationId,
          staffId: dto.staffId,
          leaveTypeId: dto.leaveTypeId,
          periodStart,
          periodEnd,
          openingBalance,
          allocatedAmount: dto.allocatedAmount,
          adjustmentAmount,
          usedAmount: 0,
          pendingAmount: 0,
        },
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async list(organizationId: string, query: ListLeaveBalancesQueryDto) {
    const where: Prisma.LeaveBalanceWhereInput = {
      organizationId,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.leaveBalance.findMany({
        where,
        orderBy: [{ periodStart: 'desc' }, { staffId: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.leaveBalance.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, balanceId: string): Promise<LeaveBalance> {
    const balance = await this.prisma.leaveBalance.findFirst({
      where: { id: balanceId, organizationId },
    });

    if (!balance) {
      throw new NotFoundException({
        code: LEAVE_ERROR_CODES.LEAVE_BALANCE_NOT_FOUND,
        message: 'Leave balance not found',
      });
    }

    return balance;
  }

  toDto(balance: LeaveBalance) {
    return {
      id: balance.id,
      organizationId: balance.organizationId,
      staffId: balance.staffId,
      leaveTypeId: balance.leaveTypeId,
      periodStart: formatLeaveDate(balance.periodStart),
      periodEnd: formatLeaveDate(balance.periodEnd),
      openingBalance: decimalToNumber(balance.openingBalance),
      allocatedAmount: decimalToNumber(balance.allocatedAmount),
      usedAmount: decimalToNumber(balance.usedAmount),
      pendingAmount: decimalToNumber(balance.pendingAmount),
      adjustmentAmount: decimalToNumber(balance.adjustmentAmount),
      availableAmount: calculateAvailableBalance(balance),
      createdAt: balance.createdAt.toISOString(),
      updatedAt: balance.updatedAt.toISOString(),
    };
  }

  private async assertStaffInOrganization(
    organizationId: string,
    staffId: string,
  ): Promise<void> {
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
        message: 'Leave balance cannot be initialized for offboarded staff',
      });
    }
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: LEAVE_ERROR_CODES.DUPLICATE_LEAVE_BALANCE,
        message: 'Leave balance already exists for this staff, leave type, and period',
      });
    }
  }
}
