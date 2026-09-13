import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveType, Prisma } from '@prisma/client';
import { buildPaginationMeta, PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LEAVE_ERROR_CODES } from './constants/leave.constants';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';
import { isValidLeaveTypeCode, normalizeLeaveTypeCode } from './utils/leave.util';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateLeaveTypeDto): Promise<LeaveType> {
    const normalizedCode = normalizeLeaveTypeCode(dto.code);

    if (!isValidLeaveTypeCode(normalizedCode)) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.INVALID_LEAVE_TYPE_CODE,
        message: 'Invalid leave type code',
      });
    }

    try {
      return await this.prisma.leaveType.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          code: normalizedCode,
          description: dto.description?.trim() || null,
          tracksBalance: dto.tracksBalance ?? true,
          allowsHalfDay: dto.allowsHalfDay ?? false,
          requiresReason: dto.requiresReason ?? false,
          requiresAttachment: dto.requiresAttachment ?? false,
          active: true,
        },
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async list(organizationId: string, query: PaginationQueryDto) {
    const where: Prisma.LeaveTypeWhereInput = { organizationId };

    const [items, total] = await Promise.all([
      this.prisma.leaveType.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.leaveType.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, leaveTypeId: string): Promise<LeaveType> {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: leaveTypeId, organizationId },
    });

    if (!leaveType) {
      throw new NotFoundException({
        code: LEAVE_ERROR_CODES.LEAVE_TYPE_NOT_FOUND,
        message: 'Leave type not found',
      });
    }

    return leaveType;
  }

  async update(
    organizationId: string,
    leaveTypeId: string,
    dto: UpdateLeaveTypeDto,
  ): Promise<LeaveType> {
    await this.findById(organizationId, leaveTypeId);

    return this.prisma.leaveType.update({
      where: { id: leaveTypeId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.tracksBalance !== undefined ? { tracksBalance: dto.tracksBalance } : {}),
        ...(dto.allowsHalfDay !== undefined ? { allowsHalfDay: dto.allowsHalfDay } : {}),
        ...(dto.requiresReason !== undefined ? { requiresReason: dto.requiresReason } : {}),
        ...(dto.requiresAttachment !== undefined
          ? { requiresAttachment: dto.requiresAttachment }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async assertActiveLeaveType(organizationId: string, leaveTypeId: string): Promise<LeaveType> {
    const leaveType = await this.findById(organizationId, leaveTypeId);

    if (!leaveType.active) {
      throw new BadRequestException({
        code: LEAVE_ERROR_CODES.INVALID_LEAVE_TYPE,
        message: 'Leave type is not active',
      });
    }

    return leaveType;
  }

  toDto(leaveType: LeaveType) {
    return {
      id: leaveType.id,
      organizationId: leaveType.organizationId,
      name: leaveType.name,
      code: leaveType.code,
      description: leaveType.description,
      tracksBalance: leaveType.tracksBalance,
      allowsHalfDay: leaveType.allowsHalfDay,
      requiresReason: leaveType.requiresReason,
      requiresAttachment: leaveType.requiresAttachment,
      active: leaveType.active,
      createdAt: leaveType.createdAt.toISOString(),
      updatedAt: leaveType.updatedAt.toISOString(),
    };
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: LEAVE_ERROR_CODES.DUPLICATE_LEAVE_TYPE_CODE,
        message: 'Leave type code is already in use',
      });
    }
  }
}
