import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApprovalRequestStatus,
  AssetStatus,
  AttendanceStatus,
  EmploymentStatus,
  LeaveRequestStatus,
  NoticeStatus,
  StudentStatus,
  VisitorStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import {
  calculateOutstanding,
  decimalToNumber,
  sumPaymentAmounts,
} from '../fees/utils/fee-amount.util';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagsService } from '../common/features/feature-flags.service';
import { parseAttendanceDate } from '../attendance/utils/attendance-date.util';
import {
  DASHBOARD_ERROR_CODES,
  OPEN_COMPLAINT_STATUSES,
  RECENT_NOTICES_LIMIT,
  UPCOMING_EVENT_STATUSES,
  UPCOMING_EVENTS_LIMIT,
} from './constants/dashboard.constants';
import {
  ASSET_ALERT_PREVIEW_LIMIT,
  ASSET_WARRANTY_ALERT_WINDOW_DAYS,
} from './constants/asset-alert.constants';
import {
  getGreetingPeriod,
  getLocalDateString,
  getLocalDayUtcRange,
} from './utils/dashboard-date.util';

export interface DashboardSummary {
  organization: {
    id: string;
    name: string;
    code: string;
    timezone: string;
  };
  generatedAt: string;
  localDate: string;
  greetingPeriod: 'morning' | 'afternoon' | 'evening';
  metrics: {
    students: number | null;
    activeStaff: number | null;
    todayAttendance: {
      date: string;
      activeStaff: number;
      marked: number;
      present: number;
      absent: number;
      unmarked: number;
    } | null;
    outstandingFees: {
      totalOutstanding: number;
      feeCount: number;
    } | null;
    pendingLeave: number | null;
    pendingApprovals: number | null;
    openComplaints: number | null;
    visitorsToday: {
      checkedInToday: number;
      activeOnCampus: number;
    } | null;
    upcomingEvents: Array<{
      id: string;
      title: string;
      status: string;
      startAt: string;
      endAt: string;
      venueName: string | null;
    }> | null;
    recentNotices: Array<{
      id: string;
      title: string;
      status: string;
      publishedAt: string | null;
    }> | null;
    unreadNotifications: number | null;
    assetAlerts: {
      total: number;
      expired: number;
      expiringSoon: number;
      items: Array<{
        id: string;
        assetCode: string;
        name: string;
        warrantyEndDate: string;
        alertType: 'expired' | 'expiring_soon';
      }>;
    } | null;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async getSummary(user: AuthenticatedUser): Promise<DashboardSummary> {
    const [organization, permissions] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        include: { settings: true },
      }),
      this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId ?? '',
      ).then((permissions) => permissions ?? []),
    ]);

    if (!organization) {
      throw new NotFoundException({
        code: DASHBOARD_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (organization.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: DASHBOARD_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use the institution dashboard',
      });
    }

    const timezone = organization.settings?.timezone ?? 'UTC';
    const localDate = getLocalDateString(timezone);
    const generatedAt = new Date().toISOString();
    const has = (permission: string) => permissions.includes(permission);

    const [
      students,
      activeStaff,
      todayAttendance,
      outstandingFees,
      pendingLeave,
      pendingApprovals,
      openComplaints,
      visitorsToday,
      upcomingEvents,
      recentNotices,
      unreadNotifications,
      assetAlerts,
    ] = await Promise.all([
      has('student.view') ? this.countActiveStudents(user.organizationId) : Promise.resolve(null),
      has('staff.view') ? this.countActiveStaff(user.organizationId) : Promise.resolve(null),
      has('attendance.view') && this.featureFlagsService.isAttendanceEnabled()
        ? this.getTodayAttendanceSummary(user.organizationId, localDate)
        : Promise.resolve(null),
      has('fee.view') ? this.getOutstandingFeesSummary(user.organizationId) : Promise.resolve(null),
      has('leave.view') ? this.countPendingLeave(user.organizationId) : Promise.resolve(null),
      has('approval.view') ? this.countPendingApprovals(user.organizationId) : Promise.resolve(null),
      has('complaint.view') ? this.countOpenComplaints(user.organizationId) : Promise.resolve(null),
      has('visitor.view')
        ? this.getVisitorsTodaySummary(user.organizationId, localDate, timezone)
        : Promise.resolve(null),
      has('event.view') ? this.getUpcomingEvents(user.organizationId) : Promise.resolve(null),
      has('notice.view') ? this.getRecentNotices(user.organizationId) : Promise.resolve(null),
      this.countUnreadNotifications(user.organizationId, user.userId),
      has('asset.view') ? this.getAssetAlertsSummary(user.organizationId) : Promise.resolve(null),
    ]);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        code: organization.code,
        timezone,
      },
      generatedAt,
      localDate,
      greetingPeriod: getGreetingPeriod(timezone),
      metrics: {
        students,
        activeStaff,
        todayAttendance,
        outstandingFees,
        pendingLeave,
        pendingApprovals,
        openComplaints,
        visitorsToday,
        upcomingEvents,
        recentNotices,
        unreadNotifications,
        assetAlerts,
      },
    };
  }

  private async getAssetAlertsSummary(organizationId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + ASSET_WARRANTY_ALERT_WINDOW_DAYS);

    const assets = await this.prisma.asset.findMany({
      where: {
        organizationId,
        status: { not: AssetStatus.RETIRED },
        warrantyEndDate: { not: null, lte: windowEnd },
      },
      select: {
        id: true,
        assetCode: true,
        name: true,
        warrantyEndDate: true,
      },
      orderBy: [{ warrantyEndDate: 'asc' }],
      take: 100,
    });

    let expired = 0;
    let expiringSoon = 0;
    const items = assets.map((asset) => {
      const warrantyEndDate = asset.warrantyEndDate!;
      const isExpired = warrantyEndDate < today;
      if (isExpired) {
        expired += 1;
      } else {
        expiringSoon += 1;
      }
      return {
        id: asset.id,
        assetCode: asset.assetCode,
        name: asset.name,
        warrantyEndDate: warrantyEndDate.toISOString().slice(0, 10),
        alertType: isExpired ? ('expired' as const) : ('expiring_soon' as const),
      };
    });

    return {
      total: items.length,
      expired,
      expiringSoon,
      items: items.slice(0, ASSET_ALERT_PREVIEW_LIMIT),
    };
  }

  private async countActiveStudents(organizationId: string): Promise<number> {
    return this.prisma.student.count({
      where: { organizationId, status: StudentStatus.ACTIVE },
    });
  }

  private async countActiveStaff(organizationId: string): Promise<number> {
    return this.prisma.staff.count({
      where: { organizationId, employmentStatus: EmploymentStatus.ACTIVE },
    });
  }

  private async getTodayAttendanceSummary(organizationId: string, localDate: string) {
    const attendanceDate = parseAttendanceDate(localDate);
    const activeStaff = await this.countActiveStaff(organizationId);

    const [marked, present, absent] = await Promise.all([
      this.prisma.staffAttendance.count({
        where: { organizationId, attendanceDate },
      }),
      this.prisma.staffAttendance.count({
        where: {
          organizationId,
          attendanceDate,
          status: AttendanceStatus.PRESENT,
        },
      }),
      this.prisma.staffAttendance.count({
        where: {
          organizationId,
          attendanceDate,
          status: AttendanceStatus.ABSENT,
        },
      }),
    ]);

    return {
      date: localDate,
      activeStaff,
      marked,
      present,
      absent,
      unmarked: Math.max(activeStaff - marked, 0),
    };
  }

  private async getOutstandingFeesSummary(organizationId: string) {
    const studentFees = await this.prisma.studentFee.findMany({
      where: { organizationId },
      include: { payments: true },
    });

    let totalOutstanding = 0;
    let feeCount = 0;

    for (const studentFee of studentFees) {
      const paidAmount = sumPaymentAmounts(studentFee.payments);
      const outstanding = decimalToNumber(calculateOutstanding(studentFee.amount, paidAmount));
      if (outstanding > 0) {
        totalOutstanding += outstanding;
        feeCount += 1;
      }
    }

    return {
      totalOutstanding,
      feeCount,
    };
  }

  private async countPendingLeave(organizationId: string): Promise<number> {
    return this.prisma.leaveRequest.count({
      where: {
        organizationId,
        status: LeaveRequestStatus.PENDING_APPROVAL,
      },
    });
  }

  private async countPendingApprovals(organizationId: string): Promise<number> {
    return this.prisma.approvalRequest.count({
      where: {
        organizationId,
        status: ApprovalRequestStatus.PENDING,
      },
    });
  }

  private async countOpenComplaints(organizationId: string): Promise<number> {
    return this.prisma.complaint.count({
      where: {
        organizationId,
        status: { in: [...OPEN_COMPLAINT_STATUSES] },
      },
    });
  }

  private async getVisitorsTodaySummary(
    organizationId: string,
    localDate: string,
    timezone: string,
  ) {
    const { startUtc, endUtc } = getLocalDayUtcRange(localDate, timezone);

    const [checkedInToday, activeOnCampus] = await Promise.all([
      this.prisma.visitor.count({
        where: {
          organizationId,
          checkInAt: { gte: startUtc, lt: endUtc },
        },
      }),
      this.prisma.visitor.count({
        where: {
          organizationId,
          status: VisitorStatus.CHECKED_IN,
        },
      }),
    ]);

    return {
      checkedInToday,
      activeOnCampus,
    };
  }

  private async getUpcomingEvents(organizationId: string) {
    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: {
        organizationId,
        status: { in: [...UPCOMING_EVENT_STATUSES] },
        endAt: { gt: now },
      },
      include: {
        venue: { select: { name: true } },
      },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      take: UPCOMING_EVENTS_LIMIT,
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      venueName: event.venue?.name ?? null,
    }));
  }

  private async getRecentNotices(organizationId: string) {
    const notices = await this.prisma.notice.findMany({
      where: {
        organizationId,
        status: NoticeStatus.PUBLISHED,
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: RECENT_NOTICES_LIMIT,
    });

    return notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      status: notice.status,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
    }));
  }

  private async countUnreadNotifications(
    organizationId: string,
    recipientUserId: string,
  ): Promise<number> {
    return this.prisma.notification.count({
      where: {
        organizationId,
        recipientUserId,
        readAt: null,
      },
    });
  }
}
