import { ForbiddenException } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { StaffSelfService } from './staff-self.service';
import { STAFF_SELF_ERROR_CODES } from './constants/staff-self.constants';

describe('StaffSelfService', () => {
  const organizationId = 'org-1';
  const userId = 'user-1';
  const staffId = 'staff-1';
  const otherStaffId = 'staff-2';

  const user = { userId, organizationId, email: 'staff@example.com' };

  const staffContextService = {
    resolveStaffProfile: jest.fn(),
    assertOperationalOrganization: jest.fn(),
  };

  const prisma = {
    organizationSettings: { findUnique: jest.fn() },
    staffAttendance: { findFirst: jest.fn() },
    leaveRequest: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    leaveType: { findMany: jest.fn() },
    notification: { count: jest.fn() },
    staff: { findFirst: jest.fn() },
  };

  const attendanceService = { list: jest.fn() };
  const leaveBalancesService = { list: jest.fn() };
  const leaveRequestsService = {
    list: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    toDto: jest.fn(),
  };
  const leaveTypesService = { list: jest.fn() };
  const approvalRequestsService = {
    findById: jest.fn(),
    toDto: jest.fn(),
    getHistory: jest.fn(),
    actionToDto: jest.fn(),
  };

  const featureFlagsService = {
    isAttendanceEnabled: jest.fn().mockReturnValue(true),
  };

  let service: StaffSelfService;

  beforeEach(() => {
    jest.clearAllMocks();
    featureFlagsService.isAttendanceEnabled.mockReturnValue(true);
    service = new StaffSelfService(
      prisma as never,
      staffContextService as never,
      attendanceService as never,
      leaveBalancesService as never,
      leaveRequestsService as never,
      leaveTypesService as never,
      approvalRequestsService as never,
      featureFlagsService as never,
    );

    staffContextService.resolveStaffProfile.mockResolvedValue({
      id: staffId,
      employeeCode: 'E001',
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: null,
      departmentId: null,
      department: null,
    });
    prisma.organizationSettings.findUnique.mockResolvedValue({ timezone: 'UTC' });
    prisma.staffAttendance.findFirst.mockResolvedValue(null);
    leaveBalancesService.list.mockResolvedValue({ data: [], meta: { total: 0 } });
    prisma.leaveType.findMany.mockResolvedValue([]);
    prisma.leaveRequest.count.mockResolvedValue(0);
    prisma.leaveRequest.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValue(2);
  });

  it('returns dashboard summary for linked staff', async () => {
    const summary = await service.getDashboard(user as never);

    expect(summary.staff.id).toBe(staffId);
    expect(summary.unreadNotificationCount).toBe(2);
    expect(summary.todayAttendance?.date).toBeDefined();
    expect(prisma.staffAttendance.findFirst).toHaveBeenCalled();
    expect(staffContextService.resolveStaffProfile).toHaveBeenCalledWith(user);
  });

  it('omits todayAttendance and skips attendance lookup when feature is disabled', async () => {
    featureFlagsService.isAttendanceEnabled.mockReturnValue(false);

    const summary = await service.getDashboard(user as never);

    expect(summary.todayAttendance).toBeUndefined();
    expect(prisma.staffAttendance.findFirst).not.toHaveBeenCalled();
  });

  it('includes todayAttendance when feature is enabled', async () => {
    prisma.staffAttendance.findFirst.mockResolvedValue({
      status: 'PRESENT',
      checkInAt: new Date('2026-09-26T09:00:00.000Z'),
      checkOutAt: null,
    });

    const summary = await service.getDashboard(user as never);

    expect(summary.todayAttendance).toMatchObject({
      status: 'PRESENT',
      checkInAt: '2026-09-26T09:00:00.000Z',
    });
    expect(prisma.staffAttendance.findFirst).toHaveBeenCalled();
  });

  it('scopes attendance list to resolved staff id', async () => {
    attendanceService.list.mockResolvedValue({ data: [], meta: { total: 0 } });

    await service.listAttendance(user as never, { page: 1, pageSize: 20 });

    expect(attendanceService.list).toHaveBeenCalledWith(organizationId, {
      staffId,
      fromDate: undefined,
      toDate: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it('rejects leave request detail when staff does not own the request', async () => {
    leaveRequestsService.findById.mockResolvedValue({
      id: 'req-1',
      staffId: otherStaffId,
      approvalRequestId: null,
      leaveType: { name: 'Casual' },
    });

    await expect(service.getLeaveRequest(user as never, 'req-1')).rejects.toMatchObject({
      response: { code: STAFF_SELF_ERROR_CODES.FORBIDDEN_LEAVE_REQUEST },
    });
  });

  it('creates leave for resolved staff without accepting client staff id', async () => {
    leaveRequestsService.create.mockResolvedValue({ id: 'req-new' });
    leaveRequestsService.toDto.mockReturnValue({ id: 'req-new', status: LeaveRequestStatus.PENDING_APPROVAL });

    await service.createLeaveRequest(user as never, {
      leaveTypeId: 'type-1',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
      reason: 'Trip',
    });

    expect(leaveRequestsService.create).toHaveBeenCalledWith(
      organizationId,
      user,
      expect.objectContaining({ staffId }),
      false,
    );
  });

  it('assertLeaveRequestOwnedByUser rejects cross-staff access', async () => {
    prisma.staff.findFirst.mockResolvedValue({ id: staffId });
    prisma.leaveRequest.findFirst.mockResolvedValue({ id: 'req-1', staffId: otherStaffId });

    await expect(
      service.assertLeaveRequestOwnedByUser(organizationId, userId, 'req-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
