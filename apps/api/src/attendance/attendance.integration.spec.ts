import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AttendanceStatus, EmploymentStatus, PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Attendance integration', () => {
  let prisma: PrismaClient;
  let attendanceService: AttendanceService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let staffAId: string;
  let staffBId: string;
  let offboardedStaffAId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    for (const permission of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: permission,
      });
    }

    const orgA = await prisma.organization.create({
      data: { name: 'Attendance School A', code: `att-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Attendance School B', code: `att-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'att-staff-a',
        firstName: 'Asha',
        lastName: 'Kapoor',
      },
    });
    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: 'att-staff-b',
        firstName: 'Biju',
        lastName: 'Menon',
      },
    });
    const offboardedStaff = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'att-offboarded',
        firstName: 'Off',
        lastName: 'Boarded',
        employmentStatus: EmploymentStatus.OFFBOARDED,
      },
    });
    staffAId = staffA.id;
    staffBId = staffB.id;
    offboardedStaffAId = offboardedStaff.id;

    attendanceService = new AttendanceService(prisma as unknown as PrismaService, {
      get: () => ({ accessSecret: 'test-secret-with-enough-length' }),
    } as never);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.staffAttendance.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates, reads, and updates attendance within a tenant', async () => {
    const created = await attendanceService.create(orgAId, {
      staffId: staffAId,
      attendanceDate: '2026-09-12',
      status: AttendanceStatus.PRESENT,
      checkInAt: '2026-09-12T09:00:00.000Z',
      checkOutAt: '2026-09-12T17:00:00.000Z',
      remarks: 'On time',
    });

    expect(created.organizationId).toBe(orgAId);
    expect(created.staffId).toBe(staffAId);

    const fetched = await attendanceService.findById(orgAId, created.id);
    expect(fetched.status).toBe(AttendanceStatus.PRESENT);

    const updated = await attendanceService.update(orgAId, created.id, {
      status: AttendanceStatus.HALF_DAY,
      remarks: 'Left early',
    });
    expect(updated.status).toBe(AttendanceStatus.HALF_DAY);
  });

  it('rejects duplicate attendance for the same staff member and date', async () => {
    await attendanceService.create(orgAId, {
      staffId: staffAId,
      attendanceDate: '2026-09-13',
      status: AttendanceStatus.ABSENT,
    });

    await expect(
      attendanceService.create(orgAId, {
        staffId: staffAId,
        attendanceDate: '2026-09-13',
        status: AttendanceStatus.PRESENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows different staff on the same date and same staff on different dates', async () => {
    const staffTwo = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `att-staff-two-${Date.now()}`,
        firstName: 'Second',
        lastName: 'Staff',
      },
    });

    await attendanceService.create(orgAId, {
      staffId: staffAId,
      attendanceDate: '2026-09-14',
      status: AttendanceStatus.PRESENT,
    });
    await attendanceService.create(orgAId, {
      staffId: staffTwo.id,
      attendanceDate: '2026-09-14',
      status: AttendanceStatus.ABSENT,
    });
    await attendanceService.create(orgAId, {
      staffId: staffAId,
      attendanceDate: '2026-09-15',
      status: AttendanceStatus.PRESENT,
    });

    const sameDay = await attendanceService.list(orgAId, {
      page: 1,
      pageSize: 10,
      attendanceDate: '2026-09-14',
    });
    expect(sameDay.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('scopes attendance reads and updates to the authenticated organization', async () => {
    const attendanceA = await attendanceService.create(orgAId, {
      staffId: staffAId,
      attendanceDate: '2026-09-16',
      status: AttendanceStatus.PRESENT,
    });

    await expect(attendanceService.findById(orgBId, attendanceA.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      attendanceService.update(orgBId, attendanceA.id, { status: AttendanceStatus.ABSENT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks creating attendance for staff from another organization', async () => {
    await expect(
      attendanceService.create(orgAId, {
        staffId: staffBId,
        attendanceDate: '2026-09-17',
        status: AttendanceStatus.PRESENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects marking attendance for offboarded staff but keeps historical records readable', async () => {
    const historical = await prisma.staffAttendance.create({
      data: {
        organizationId: orgAId,
        staffId: offboardedStaffAId,
        attendanceDate: new Date(Date.UTC(2026, 8, 10)),
        status: AttendanceStatus.PRESENT,
      },
    });

    const fetched = await attendanceService.findById(orgAId, historical.id);
    expect(fetched.staff.employmentStatus).toBe(EmploymentStatus.OFFBOARDED);

    await expect(
      attendanceService.create(orgAId, {
        staffId: offboardedStaffAId,
        attendanceDate: '2026-09-18',
        status: AttendanceStatus.PRESENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filters attendance by date, staff, and status within a tenant', async () => {
    const listed = await attendanceService.list(orgAId, {
      page: 1,
      pageSize: 10,
      staffId: staffAId,
      status: AttendanceStatus.PRESENT,
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
    });

    expect(listed.data.every((item) => item.staffId === staffAId)).toBe(true);
  });

  it('rejects invalid check-out before check-in', async () => {
    await expect(
      attendanceService.create(orgAId, {
        staffId: staffAId,
        attendanceDate: '2026-09-19',
        status: AttendanceStatus.PRESENT,
        checkInAt: '2026-09-19T17:00:00.000Z',
        checkOutAt: '2026-09-19T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('denies attendance mark permission when attendance.mark is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['attendance.view']);

    const request = {
      user: {
        userId: '00000000-0000-4000-8000-000000000001',
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'user@example.com',
        activeRoleId: '00000000-0000-4000-8000-000000000099',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['attendance.mark']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
