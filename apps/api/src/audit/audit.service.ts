import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_DATE_PATTERN, AUDIT_ERROR_CODES } from './constants/audit.constants';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { RecordAuditEventInput } from './dto/record-audit-event.dto';
import { auditActorContext } from './audit-actor.context';
import { sanitizeAuditValue } from './utils/audit-sanitizer';

type AuditWriteClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEventInput, client?: AuditWriteClient): Promise<void> {
    const db = client ?? this.prisma;

    const metadata = this.withActiveRole(input.metadata);

    await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        requestId: input.requestId ?? null,
        ...(input.before !== undefined
          ? { before: sanitizeAuditValue(input.before) as Prisma.InputJsonValue }
          : {}),
        ...(input.after !== undefined
          ? { after: sanitizeAuditValue(input.after) as Prisma.InputJsonValue }
          : {}),
        ...(metadata !== undefined
          ? { metadata: sanitizeAuditValue(metadata) as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async list(organizationId: string, query: ListAuditLogsQueryDto) {
    const dateRange = this.buildDateRange(query.fromDate, query.toDate);
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(dateRange
        ? {
            createdAt: {
              ...(dateRange.from ? { gte: dateRange.from } : {}),
              ...(dateRange.to ? { lt: dateRange.to } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.toDto(log)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  private withActiveRole(metadata: Prisma.InputJsonValue | undefined): Prisma.InputJsonValue | undefined {
    const actor = auditActorContext.getStore();
    if (!actor?.activeRoleCode && !actor?.activeRoleId) {
      return metadata;
    }

    const base =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};

    return {
      ...base,
      ...(actor.activeRoleId ? { activeRoleId: actor.activeRoleId } : {}),
      ...(actor.activeRoleCode ? { activeRoleCode: actor.activeRoleCode } : {}),
    };
  }

  private buildDateRange(fromDate: string | undefined, toDate: string | undefined) {
    if (!fromDate && !toDate) {
      return undefined;
    }

    const from = fromDate ? this.parseCalendarDate(fromDate) : undefined;
    const to = toDate ? this.parseCalendarDate(toDate) : undefined;

    if (from && to && to < from) {
      throw new BadRequestException({
        code: AUDIT_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'Audit toDate cannot be earlier than fromDate',
      });
    }

    return {
      from: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      to: to ? new Date(`${this.addCalendarDay(to)}T00:00:00.000Z`) : undefined,
    };
  }

  private parseCalendarDate(value: string): string {
    if (!AUDIT_DATE_PATTERN.test(value)) {
      throw new BadRequestException({
        code: AUDIT_ERROR_CODES.INVALID_DATE,
        message: 'Audit dates must use YYYY-MM-DD format',
      });
    }

    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException({
        code: AUDIT_ERROR_CODES.INVALID_DATE,
        message: 'Audit date is invalid',
      });
    }

    return value;
  }

  private addCalendarDay(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  }

  private toDto(log: {
    id: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    requestId: string | null;
    before: Prisma.JsonValue;
    after: Prisma.JsonValue;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      id: log.id,
      actorUserId: log.actorUserId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      requestId: log.requestId,
      before: this.toResponseJson(log.before),
      after: this.toResponseJson(log.after),
      metadata: this.toResponseJson(log.metadata),
      createdAt: log.createdAt.toISOString(),
    };
  }

  private toResponseJson(value: Prisma.JsonValue): Record<string, unknown> | null {
    if (value === null) {
      return null;
    }

    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }

    return { value };
  }
}
