import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, LeaveRequestStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import {
  DASHBOARD_ERROR_CODES,
  UPCOMING_EVENT_STATUSES,
} from '../dashboard/constants/dashboard.constants';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseAttendanceDate } from '../attendance/utils/attendance-date.util';
import { CalendarQueryDto } from './dto/calendar-query.dto';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getItems(user: AuthenticatedUser, query: CalendarQueryDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!organization) {
      throw new NotFoundException({
        code: DASHBOARD_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (organization.code === PLATFORM_ORGANIZATION_CODE) {
      throw new BadRequestException({
        code: DASHBOARD_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use the institution calendar',
      });
    }

    const start = parseAttendanceDate(query.startDate);
    const end = parseAttendanceDate(query.endDate);
    if (end < start) {
      throw new BadRequestException({
        code: 'INVALID_CALENDAR_RANGE',
        message: 'endDate must be on or after startDate',
      });
    }

    const rangeEnd = new Date(end);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

    const permissions =
      (await this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId ?? '',
      )) ?? [];
    const has = (code: string) => permissions.includes(code);
    const canViewOrgLeave = has('leave.view');
    const canViewSelfLeave = has('staff.self.leave.view');
    const canViewEvents = has('event.view');

    if (!canViewOrgLeave && !canViewSelfLeave && !canViewEvents) {
      throw new ForbiddenException({
        code: 'CALENDAR_FORBIDDEN',
        message: 'You do not have permission to view the calendar',
      });
    }

    let selfStaffId: string | null = null;
    if (!canViewOrgLeave && canViewSelfLeave) {
      const staff = await this.prisma.staff.findFirst({
        where: {
          organizationId: user.organizationId,
          userId: user.userId,
          employmentStatus: { not: EmploymentStatus.OFFBOARDED },
        },
        select: { id: true },
      });
      selfStaffId = staff?.id ?? null;
    }

    const leaveScopeReady = canViewOrgLeave || (canViewSelfLeave && selfStaffId);

    const leaveWhereBase = {
      organizationId: user.organizationId,
      status: {
        in: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.PENDING_APPROVAL],
      },
      startDate: { lt: rangeEnd },
      endDate: { gte: start },
      ...(canViewOrgLeave ? {} : { staffId: selfStaffId! }),
    };

    const [leaveItems, eventItems] = await Promise.all([
      leaveScopeReady
        ? this.prisma.leaveRequest.findMany({
            where: leaveWhereBase,
            include: {
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  displayName: true,
                },
              },
              leaveType: { select: { name: true } },
            },
            orderBy: [{ startDate: 'asc' }],
          })
        : Promise.resolve([]),
      canViewEvents
        ? this.prisma.event.findMany({
            where: {
              organizationId: user.organizationId,
              status: { in: [...UPCOMING_EVENT_STATUSES] },
              startAt: { lt: rangeEnd },
              endAt: { gte: start },
            },
            include: {
              venue: { select: { name: true } },
            },
            orderBy: [{ startAt: 'asc' }],
          })
        : Promise.resolve([]),
    ]);

    return {
      data: {
        startDate: query.startDate,
        endDate: query.endDate,
        leave: leaveItems.map((item) => ({
          id: item.id,
          type: 'leave' as const,
          title: `${item.leaveType.name} — ${
            item.staff.displayName?.trim() ||
            `${item.staff.firstName} ${item.staff.lastName}`.trim()
          }`,
          status: item.status,
          startDate: item.startDate.toISOString().slice(0, 10),
          endDate: item.endDate.toISOString().slice(0, 10),
        })),
        events: eventItems.map((event) => ({
          id: event.id,
          type: 'event' as const,
          title: event.title,
          status: event.status,
          startAt: event.startAt.toISOString(),
          endAt: event.endAt.toISOString(),
          venueName: event.venue?.name ?? null,
        })),
      },
    };
  }
}
