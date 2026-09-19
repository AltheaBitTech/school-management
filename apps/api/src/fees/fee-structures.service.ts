import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { FeeStructure, FeeStructureStatus, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FEE_ERROR_CODES } from './constants/fee.constants';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { ListFeeStructuresQueryDto } from './dto/list-fee-structures-query.dto';
import { decimalToNumber, toFeeDecimal } from './utils/fee-amount.util';
import {
  assertValidFeePeriod,
  formatFeeDate,
  parseFeeDate,
} from './utils/fee-date.util';

@Injectable()
export class FeeStructuresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    actor: AuthenticatedUser,
    dto: CreateFeeStructureDto,
    options?: { requestId?: string },
  ): Promise<FeeStructure> {
    const periodStart = parseFeeDate(dto.periodStart, 'Period start');
    const periodEnd = parseFeeDate(dto.periodEnd, 'Period end');
    assertValidFeePeriod(periodStart, periodEnd);

    const amount = toFeeDecimal(dto.amount);

    const feeStructure = await this.prisma.feeStructure.create({
      data: {
        organizationId: actor.organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        amount,
        periodStart,
        periodEnd,
        status: FeeStructureStatus.ACTIVE,
      },
    });

    await this.auditService.record({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.FEE_STRUCTURE_CREATED,
      entityType: AUDIT_ENTITY_TYPES.FEE_STRUCTURE,
      entityId: feeStructure.id,
      requestId: options?.requestId,
      after: {
        name: feeStructure.name,
        amount: decimalToNumber(feeStructure.amount),
        periodStart: formatFeeDate(feeStructure.periodStart),
        periodEnd: formatFeeDate(feeStructure.periodEnd),
      },
    });

    return feeStructure;
  }

  async list(organizationId: string, query: ListFeeStructuresQueryDto) {
    const where: Prisma.FeeStructureWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.feeStructure.findMany({
        where,
        orderBy: [{ periodStart: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.feeStructure.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, feeStructureId: string): Promise<FeeStructure> {
    const feeStructure = await this.prisma.feeStructure.findFirst({
      where: { id: feeStructureId, organizationId },
    });

    if (!feeStructure) {
      throw new NotFoundException({
        code: FEE_ERROR_CODES.FEE_STRUCTURE_NOT_FOUND,
        message: 'Fee structure not found',
      });
    }

    return feeStructure;
  }

  async assertActiveFeeStructure(
    organizationId: string,
    feeStructureId: string,
  ): Promise<FeeStructure> {
    const feeStructure = await this.findById(organizationId, feeStructureId);

    if (feeStructure.status !== FeeStructureStatus.ACTIVE) {
      throw new BadRequestException({
        code: FEE_ERROR_CODES.FEE_STRUCTURE_INACTIVE,
        message: 'Fee structure is not active',
      });
    }

    return feeStructure;
  }

  toDto(feeStructure: FeeStructure) {
    return {
      id: feeStructure.id,
      name: feeStructure.name,
      description: feeStructure.description,
      amount: decimalToNumber(feeStructure.amount),
      periodStart: formatFeeDate(feeStructure.periodStart),
      periodEnd: formatFeeDate(feeStructure.periodEnd),
      status: feeStructure.status,
      createdAt: feeStructure.createdAt.toISOString(),
      updatedAt: feeStructure.updatedAt.toISOString(),
    };
  }
}
