import { ForbiddenException } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { DashboardService } from './dashboard.service';
import { FeatureFlagsService } from '../common/features/feature-flags.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    organization: { findUnique: jest.Mock };
    student: { count: jest.Mock };
    staff: { count: jest.Mock };
    staffAttendance: { count: jest.Mock };
    studentFee: { findMany: jest.Mock };
    leaveRequest: { count: jest.Mock };
    approvalRequest: { count: jest.Mock };
    complaint: { count: jest.Mock };
    visitor: { count: jest.Mock };
    event: { findMany: jest.Mock };
    notice: { findMany: jest.Mock };
    notification: { count: jest.Mock };
  };
  let permissionsService: jest.Mocked<Pick<PermissionsService, 'getEffectivePermissions'>>;

  const user = {
    userId: 'user-1',
    organizationId: 'org-1',
    sessionId: 'session-1',
    email: 'admin@school.example',
  };

  beforeEach(() => {
    prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Test School',
          code: 'test-school',
          settings: { timezone: 'UTC' },
        }),
      },
      student: { count: jest.fn().mockResolvedValue(10) },
      staff: { count: jest.fn().mockResolvedValue(5) },
      staffAttendance: { count: jest.fn().mockResolvedValue(0) },
      studentFee: { findMany: jest.fn().mockResolvedValue([]) },
      leaveRequest: { count: jest.fn().mockResolvedValue(2) },
      approvalRequest: { count: jest.fn().mockResolvedValue(1) },
      complaint: { count: jest.fn().mockResolvedValue(3) },
      visitor: { count: jest.fn().mockResolvedValue(0) },
      event: { findMany: jest.fn().mockResolvedValue([]) },
      notice: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { count: jest.fn().mockResolvedValue(4) },
    };

    permissionsService = {
      getEffectivePermissions: jest.fn().mockResolvedValue([
        'dashboard.view',
        'student.view',
        'staff.view',
        'attendance.view',
        'fee.view',
        'leave.view',
        'approval.view',
        'complaint.view',
        'visitor.view',
        'event.view',
        'notice.view',
      ]),
    };

    service = new DashboardService(
      prisma as unknown as PrismaService,
      permissionsService as unknown as PermissionsService,
      { isAttendanceEnabled: () => true } as FeatureFlagsService,
    );
  });

  it('returns summary metrics for permitted modules', async () => {
    const summary = await service.getSummary(user);

    expect(summary.organization.name).toBe('Test School');
    expect(summary.metrics.students).toBe(10);
    expect(summary.metrics.activeStaff).toBe(5);
    expect(summary.metrics.pendingLeave).toBe(2);
    expect(summary.metrics.unreadNotifications).toBe(4);
  });

  it('omits metrics when module permissions are missing', async () => {
    permissionsService.getEffectivePermissions.mockResolvedValue(['dashboard.view', 'student.view']);

    const summary = await service.getSummary(user);

    expect(summary.metrics.students).toBe(10);
    expect(summary.metrics.activeStaff).toBeNull();
    expect(summary.metrics.pendingLeave).toBeNull();
  });

  it('rejects platform organization dashboard access', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'platform-org',
      name: 'CampusOps Platform',
      code: PLATFORM_ORGANIZATION_CODE,
      settings: { timezone: 'UTC' },
    });

    await expect(
      service.getSummary({
        ...user,
        organizationId: 'platform-org',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
