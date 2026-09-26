import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { AttendanceService } from '../attendance/attendance.service';
import { parseAttendanceDate } from '../attendance/utils/attendance-date.util';
import { ApprovalRequestsService } from '../approvals/approval-requests.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getLocalDateString } from '../dashboard/utils/dashboard-date.util';
import { LeaveBalancesService } from '../leave/leave-balances.service';
import { LeaveRequestsService } from '../leave/leave-requests.service';
import { LeaveTypesService } from '../leave/leave-types.service';
import { LEAVE_ERROR_CODES } from '../leave/constants/leave.constants';
import { formatLeaveDate } from '../leave/utils/leave.util';
import { PrismaService } from '../prisma/prisma.service';
import { STAFF_SELF_ERROR_CODES, STAFF_SELF_RECENT_LEAVE_LIMIT } from './constants/staff-self.constants';
import { CreateStaffSelfLeaveRequestDto } from './dto/create-staff-self-leave-request.dto';
import { StaffSelfAttendanceQueryDto } from './dto/staff-self-attendance-query.dto';
import {
  StaffSelfDashboardDto,
  StaffSelfLeaveRequestDetailDto,
} from './dto/staff-self-response.dto';
import { StaffContextService } from './staff-context.service';

@Injectable()
export class StaffSelfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffContextService: StaffContextService,
    private readonly attendanceService: AttendanceService,
    private readonly leaveBalancesService: LeaveBalancesService,
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly leaveTypesService: LeaveTypesService,
    private readonly approvalRequestsService: ApprovalRequestsService,
  ) {}

  async getDashboard(user: AuthenticatedUser): Promise<StaffSelfDashboardDto> {
    const staff = await this.staffContextService.resolveStaffProfile(user);
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: user.organizationId },
      select: { timezone: true },
    });
    const timezone = settings?.timezone ?? 'UTC';
    const localDate = getLocalDateString(timezone);

    const todayRecord = await this.prisma.staffAttendance.findFirst({
      where: {
        organizationId: user.organizationId,
        staffId: staff.id,
        attendanceDate: parseAttendanceDate(localDate),
      },
    });

    const balancesResult = await this.leaveBalancesService.list(user.organizationId, {
      staffId: staff.id,
      page: 1,
      pageSize: 50,
    });

    const leaveTypeIds = [...new Set(balancesResult.data.map((balance) => balance.leaveTypeId))];
    const leaveTypes = leaveTypeIds.length
      ? await this.prisma.leaveType.findMany({
          where: { organizationId: user.organizationId, id: { in: leaveTypeIds } },
          select: { id: true, name: true },
        })
      : [];
    const leaveTypeNameById = new Map(leaveTypes.map((type) => [type.id, type.name]));

    const [pendingLeaveRequestCount, recentRequests, unreadNotificationCount] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: {
          organizationId: user.organizationId,
          staffId: staff.id,
          status: LeaveRequestStatus.PENDING_APPROVAL,
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: { organizationId: user.organizationId, staffId: staff.id },
        include: { leaveType: { select: { name: true } } },
        orderBy: { submittedAt: 'desc' },
        take: STAFF_SELF_RECENT_LEAVE_LIMIT,
      }),
      this.prisma.notification.count({
        where: {
          organizationId: user.organizationId,
          recipientUserId: user.userId,
          readAt: null,
        },
      }),
    ]);

    return {
      staff: {
        id: staff.id,
        employeeCode: staff.employeeCode,
        firstName: staff.firstName,
        lastName: staff.lastName,
        displayName: staff.displayName,
        departmentName: staff.department?.name ?? null,
      },
      localDate,
      todayAttendance: {
        date: localDate,
        status: todayRecord?.status ?? null,
        checkInAt: todayRecord?.checkInAt?.toISOString() ?? null,
        checkOutAt: todayRecord?.checkOutAt?.toISOString() ?? null,
      },
      leaveBalances: balancesResult.data.map((balance) => ({
        leaveTypeId: balance.leaveTypeId,
        leaveTypeName: leaveTypeNameById.get(balance.leaveTypeId) ?? 'Leave',
        availableAmount: balance.availableAmount,
        usedAmount: balance.usedAmount,
        pendingAmount: balance.pendingAmount,
      })),
      pendingLeaveRequestCount,
      recentLeaveRequests: recentRequests.map((request) => ({
        id: request.id,
        leaveTypeName: request.leaveType.name,
        startDate: formatLeaveDate(request.startDate),
        endDate: formatLeaveDate(request.endDate),
        status: request.status,
        submittedAt: request.submittedAt.toISOString(),
      })),
      unreadNotificationCount,
    };
  }

  async listAttendance(user: AuthenticatedUser, query: StaffSelfAttendanceQueryDto) {
    const staff = await this.staffContextService.resolveStaffProfile(user);

    return this.attendanceService.list(user.organizationId, {
      staffId: staff.id,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async listLeaveBalances(user: AuthenticatedUser, query: PaginationQueryDto) {
    const staff = await this.staffContextService.resolveStaffProfile(user);

    return this.leaveBalancesService.list(user.organizationId, {
      staffId: staff.id,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async listLeaveTypes(user: AuthenticatedUser, query: PaginationQueryDto) {
    await this.staffContextService.resolveStaffProfile(user);

    const result = await this.leaveTypesService.list(user.organizationId, query);
    return {
      ...result,
      data: result.data.filter((type) => type.active),
    };
  }

  async listLeaveRequests(user: AuthenticatedUser, query: PaginationQueryDto) {
    const staff = await this.staffContextService.resolveStaffProfile(user);

    return this.leaveRequestsService.list(user.organizationId, {
      staffId: staff.id,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async getLeaveRequest(user: AuthenticatedUser, requestId: string): Promise<StaffSelfLeaveRequestDetailDto> {
    const staff = await this.staffContextService.resolveStaffProfile(user);
    const request = await this.leaveRequestsService.findById(user.organizationId, requestId);

    if (request.staffId !== staff.id) {
      throw new ForbiddenException({
        code: STAFF_SELF_ERROR_CODES.FORBIDDEN_LEAVE_REQUEST,
        message: 'You can only view your own leave requests',
      });
    }

    const dto = this.leaveRequestsService.toDto(request);
    let approval = null;
    let approvalHistory: ReturnType<ApprovalRequestsService['actionToDto']>[] = [];

    if (request.approvalRequestId) {
      const approvalRequest = await this.approvalRequestsService.findById(
        user.organizationId,
        request.approvalRequestId,
      );
      approval = await this.approvalRequestsService.toDto(approvalRequest);
      const actions = await this.approvalRequestsService.getHistory(
        user.organizationId,
        request.approvalRequestId,
      );
      approvalHistory = actions.map((action) => this.approvalRequestsService.actionToDto(action));
    }

    const rejectionComment =
      approvalHistory.find((action) => action.action === 'REJECTED')?.comment ?? null;

    return {
      id: dto.id,
      leaveTypeName: dto.leaveType.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      duration: dto.duration,
      reason: dto.reason,
      status: dto.status,
      submittedAt: dto.submittedAt,
      approval,
      approvalHistory,
      rejectionReason: rejectionComment,
    };
  }

  async createLeaveRequest(user: AuthenticatedUser, dto: CreateStaffSelfLeaveRequestDto) {
    const staff = await this.staffContextService.resolveStaffProfile(user);

    const created = await this.leaveRequestsService.create(
      user.organizationId,
      user,
      {
        staffId: staff.id,
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        halfDayPart: dto.halfDayPart,
        reason: dto.reason,
      },
      false,
    );

    return this.leaveRequestsService.toDto(created);
  }

  async assertLeaveRequestOwnedByUser(
    organizationId: string,
    userId: string,
    requestId: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { organizationId, userId },
    });

    if (!staff) {
      throw new ForbiddenException({
        code: STAFF_SELF_ERROR_CODES.STAFF_PROFILE_NOT_LINKED,
        message: 'No active staff profile is linked to your user account',
      });
    }

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      throw new NotFoundException({
        code: LEAVE_ERROR_CODES.LEAVE_REQUEST_NOT_FOUND,
        message: 'Leave request not found',
      });
    }

    if (request.staffId !== staff.id) {
      throw new ForbiddenException({
        code: STAFF_SELF_ERROR_CODES.FORBIDDEN_LEAVE_REQUEST,
        message: 'You can only view your own leave requests',
      });
    }
  }
}
