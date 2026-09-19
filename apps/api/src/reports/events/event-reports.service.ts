import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EVENT_REPORT_DATE_PATTERN,
  EVENT_REPORT_ERROR_CODES,
} from './constants/event-report.constants';
import { EventReportQueryDto } from './dto/event-report-query.dto';

const reportRowSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  startAt: true,
  endAt: true,
  venue: { select: { id: true, name: true } },
} as const;

type EventReportRow = Prisma.EventGetPayload<{ select: typeof reportRowSelect }>;

@Injectable()
export class EventReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, query: EventReportQueryDto) {
    const timezone = await this.getOrganizationTimezone(organizationId);
    const dateRange = this.buildDateRange(query.fromDate, query.toDate, timezone);
    const where: Prisma.EventWhereInput = {
      organizationId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.venueId ? { venueId: query.venueId } : {}),
      ...(dateRange
        ? {
            startAt: { lt: dateRange.toUtc },
            endAt: { gt: dateRange.fromUtc },
          }
        : {}),
    };

    const [events, total, statusGroups] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: reportRowSelect,
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.event.count({ where }),
      this.prisma.event.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      data: events.map((event) => this.toRowDto(event)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
      summary: {
        total,
        byStatus: Object.fromEntries(
          statusGroups.map((group) => [group.status, group._count._all]),
        ),
      },
    };
  }

  private async getOrganizationTimezone(organizationId: string): Promise<string> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { timezone: true },
    });
    return settings?.timezone ?? 'UTC';
  }

  private buildDateRange(fromDate: string | undefined, toDate: string | undefined, timezone: string) {
    if (!fromDate && !toDate) {
      return undefined;
    }

    const from = fromDate ? this.parseCalendarDate(fromDate) : '1970-01-01';
    const to = toDate ? this.parseCalendarDate(toDate) : '9999-12-31';
    if (to < from) {
      throw new BadRequestException({
        code: EVENT_REPORT_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'Report toDate cannot be earlier than fromDate',
      });
    }

    const exclusiveTo = this.addCalendarDay(to);
    return {
      fromUtc: this.localDateTimeToUtc(`${from}T00:00`, timezone),
      toUtc: this.localDateTimeToUtc(`${exclusiveTo}T00:00`, timezone),
    };
  }

  private parseCalendarDate(value: string): string {
    if (!EVENT_REPORT_DATE_PATTERN.test(value)) {
      throw new BadRequestException({
        code: EVENT_REPORT_ERROR_CODES.INVALID_DATE,
        message: 'Report dates must use YYYY-MM-DD format',
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
        code: EVENT_REPORT_ERROR_CODES.INVALID_DATE,
        message: 'Report date is invalid',
      });
    }

    return value;
  }

  private addCalendarDay(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  }

  private localDateTimeToUtc(value: string, timezone: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException({
        code: EVENT_REPORT_ERROR_CODES.INVALID_DATE,
        message: 'Report date is invalid',
      });
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const hour = Number(hourValue);
    const minute = Number(minuteValue);
    let timestamp = Date.UTC(year, month - 1, day, hour, minute);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(timestamp));
      const values = Object.fromEntries(
        parts
          .filter((part) => part.type !== 'literal')
          .map((part) => [part.type, Number(part.value)]),
      );
      const interpreted = Date.UTC(
        values.year,
        values.month - 1,
        values.day,
        values.hour,
        values.minute,
        values.second,
      );
      timestamp += Date.UTC(year, month - 1, day, hour, minute) - interpreted;
    }

    return new Date(timestamp);
  }

  private toRowDto(event: EventReportRow) {
    return {
      id: event.id,
      title: event.title,
      type: event.type,
      status: event.status,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      venue: event.venue,
    };
  }
}
