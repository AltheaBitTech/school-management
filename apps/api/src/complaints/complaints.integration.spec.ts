import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  EmploymentStatus,
  PrismaClient,
} from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { ComplaintsService } from './complaints.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Complaints integration', () => {
  let prisma: PrismaClient;
  let complaintsService: ComplaintsService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let staffAId: string;
  let staffBId: string;
  let offboardedStaffAId: string;

  const actorA = {
    userId: '',
    organizationId: '',
    sessionId: 'session-a',
    email: 'admin-a@example.com',
  };

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
      data: { name: 'Complaint School A', code: `complaint-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Complaint School B', code: `complaint-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `complaint-user-a-${Date.now()}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `complaint-user-b-${Date.now()}@example.com` },
    });
    userAId = userA.id;
    userBId = userB.id;

    actorA.userId = userAId;
    actorA.organizationId = orgAId;

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'cmp-staff-a',
        firstName: 'Complaint',
        lastName: 'StaffA',
      },
    });
    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: 'cmp-staff-b',
        firstName: 'Complaint',
        lastName: 'StaffB',
      },
    });
    const offboardedStaff = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'cmp-offboarded',
        firstName: 'Offboarded',
        lastName: 'Staff',
        employmentStatus: EmploymentStatus.OFFBOARDED,
      },
    });

    staffAId = staffA.id;
    staffBId = staffB.id;
    offboardedStaffAId = offboardedStaff.id;

    complaintsService = new ComplaintsService(prisma as unknown as PrismaService);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.complaintHistory.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.complaint.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates complaints with generated codes and initial history', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Broken projector',
      description: 'Projector in room 12 does not turn on.',
      category: ComplaintCategory.IT,
      priority: ComplaintPriority.HIGH,
      location: 'Room 12',
    });

    expect(complaint.organizationId).toBe(orgAId);
    expect(complaint.complaintCode).toBe('cmp-000001');
    expect(complaint.status).toBe(ComplaintStatus.OPEN);
    expect(complaint.createdByUserId).toBe(userAId);
    expect(complaint.history).toHaveLength(1);
    expect(complaint.history[0]?.newStatus).toBe(ComplaintStatus.OPEN);
  });

  it('lists, reads, and updates complaints within a tenant', async () => {
    const created = await complaintsService.create(orgAId, actorA, {
      title: 'Leaking tap',
      description: 'Tap in staff restroom is leaking.',
      category: ComplaintCategory.PLUMBING,
      priority: ComplaintPriority.MEDIUM,
    });

    const listed = await complaintsService.list(orgAId, {
      page: 1,
      pageSize: 10,
      status: ComplaintStatus.OPEN,
    });
    expect(listed.data.some((item) => item.id === created.id)).toBe(true);

    const fetched = await complaintsService.findById(orgAId, created.id);
    expect(fetched.title).toBe('Leaking tap');

    const updated = await complaintsService.update(orgAId, created.id, {
      title: 'Leaking tap in staff restroom',
      priority: ComplaintPriority.HIGH,
    });
    expect(updated.title).toBe('Leaking tap in staff restroom');
    expect(updated.priority).toBe(ComplaintPriority.HIGH);
  });

  it('assigns staff and advances OPEN to ASSIGNED', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Broken chair',
      description: 'Chair in classroom 3A is broken.',
      category: ComplaintCategory.FURNITURE,
      priority: ComplaintPriority.LOW,
    });

    const assigned = await complaintsService.assign(orgAId, complaint.id, actorA, {
      assignedToStaffId: staffAId,
    });

    expect(assigned.status).toBe(ComplaintStatus.ASSIGNED);
    expect(assigned.assignedToStaffId).toBe(staffAId);
    expect(assigned.history.some((entry) => entry.comment === 'Complaint assigned')).toBe(true);
  });

  it('rejects invalid staff assignment and cross-tenant staff', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Security gate issue',
      description: 'Main gate latch is loose.',
      category: ComplaintCategory.SECURITY,
      priority: ComplaintPriority.CRITICAL,
    });

    await expect(
      complaintsService.assign(orgAId, complaint.id, actorA, {
        assignedToStaffId: staffBId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      complaintsService.assign(orgAId, complaint.id, actorA, {
        assignedToStaffId: offboardedStaffAId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces strict status transitions through closure', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Cleaning required',
      description: 'Science lab needs deep cleaning.',
      category: ComplaintCategory.CLEANING,
      priority: ComplaintPriority.MEDIUM,
    });

    await complaintsService.assign(orgAId, complaint.id, actorA, {
      assignedToStaffId: staffAId,
    });

    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.IN_PROGRESS },
      true,
    );
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.COMPLETED },
      true,
    );

    const closed = await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.CLOSED },
      true,
    );

    expect(closed.status).toBe(ComplaintStatus.CLOSED);
    expect(closed.closedAt).not.toBeNull();

    await expect(
      complaintsService.update(orgAId, complaint.id, { title: 'Should fail' }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.IN_PROGRESS },
        true,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects skipped and backward status transitions', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Electrical fault',
      description: 'Lights flicker in corridor B.',
      category: ComplaintCategory.ELECTRICAL,
      priority: ComplaintPriority.HIGH,
    });

    await expect(
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.IN_PROGRESS },
        true,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await complaintsService.assign(orgAId, complaint.id, actorA, {
      assignedToStaffId: staffAId,
    });

    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.IN_PROGRESS },
      true,
    );

    await expect(
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.ASSIGNED },
        true,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires complaint.close permission to close complaints', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Close permission test',
      description: 'Workflow to verify close permission.',
      category: ComplaintCategory.OTHER,
      priority: ComplaintPriority.LOW,
    });

    await complaintsService.assign(orgAId, complaint.id, actorA, {
      assignedToStaffId: staffAId,
    });
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.IN_PROGRESS },
      true,
    );
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.COMPLETED },
      true,
    );

    await expect(
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.CLOSED },
        false,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('appends comment-only history entries', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Comment test',
      description: 'Need follow-up note.',
      category: ComplaintCategory.IT,
      priority: ComplaintPriority.LOW,
    });

    const withComment = await complaintsService.addComment(orgAId, complaint.id, actorA, {
      comment: 'Technician scheduled for tomorrow.',
    });

    const commentEntry = withComment.history.find(
      (entry) => entry.comment === 'Technician scheduled for tomorrow.',
    );
    expect(commentEntry?.oldStatus).toBeNull();
    expect(commentEntry?.newStatus).toBeNull();
  });

  it('blocks cross-tenant complaint access and mutation', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Tenant isolation',
      description: 'Cross-tenant access must fail.',
      category: ComplaintCategory.SECURITY,
      priority: ComplaintPriority.HIGH,
    });

    await expect(complaintsService.findById(orgBId, complaint.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      complaintsService.assign(orgBId, complaint.id, { ...actorA, organizationId: orgBId }, {
        assignedToStaffId: staffBId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      complaintsService.addComment(
        orgBId,
        complaint.id,
        { ...actorA, userId: userBId, organizationId: orgBId },
        { comment: 'Cross tenant comment' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects OPEN to ASSIGNED through the status endpoint', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Status assign bypass',
      description: 'OPEN complaints must use assign.',
      category: ComplaintCategory.IT,
      priority: ComplaintPriority.MEDIUM,
    });

    await expect(
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.ASSIGNED },
        true,
      ),
    ).rejects.toMatchObject({
      message: 'OPEN complaints must be assigned through the assign endpoint.',
    });

    const refreshed = await complaintsService.findById(orgAId, complaint.id);
    expect(refreshed.status).toBe(ComplaintStatus.OPEN);
    expect(refreshed.assignedToStaffId).toBeNull();
  });

  it('cannot move OPEN to ASSIGNED through status even when assign permission is absent at service level', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Update-only assign bypass',
      description: 'Status endpoint must not assign.',
      category: ComplaintCategory.PLUMBING,
      priority: ComplaintPriority.LOW,
    });

    await expect(
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.ASSIGNED },
        false,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const refreshed = await complaintsService.findById(orgAId, complaint.id);
    expect(refreshed.status).toBe(ComplaintStatus.OPEN);
    expect(refreshed.assignedToStaffId).toBeNull();
  });

  it('rejects PATCH updates on CLOSED complaints', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Closed patch guard',
      description: 'Closed complaints are terminal.',
      category: ComplaintCategory.FURNITURE,
      priority: ComplaintPriority.LOW,
    });

    await complaintsService.assign(orgAId, complaint.id, actorA, {
      assignedToStaffId: staffAId,
    });
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.IN_PROGRESS },
      true,
    );
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.COMPLETED },
      true,
    );
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.CLOSED },
      true,
    );

    await expect(
      complaintsService.update(orgAId, complaint.id, { title: 'Closed mutation attempt' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('serializes concurrent close and update so a closed complaint cannot be patched afterward', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Concurrent close/update',
      description: 'Close and patch must not violate terminal state.',
      category: ComplaintCategory.CLEANING,
      priority: ComplaintPriority.HIGH,
    });

    await complaintsService.assign(orgAId, complaint.id, actorA, {
      assignedToStaffId: staffAId,
    });
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.IN_PROGRESS },
      true,
    );
    await complaintsService.changeStatus(
      orgAId,
      complaint.id,
      actorA,
      { status: ComplaintStatus.COMPLETED },
      true,
    );

    const results = await Promise.allSettled([
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.CLOSED },
        true,
      ),
      complaintsService.update(orgAId, complaint.id, { title: 'Post-close race title' }),
    ]);

    expect(results[0].status).toBe('fulfilled');

    const refreshed = await complaintsService.findById(orgAId, complaint.id);
    expect(refreshed.status).toBe(ComplaintStatus.CLOSED);
    expect(refreshed.closedAt).not.toBeNull();

    if (results[1].status === 'rejected') {
      expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
      expect(refreshed.title).toBe('Concurrent close/update');
    }
  });

  it('allows only one concurrent status transition from ASSIGNED to IN_PROGRESS', async () => {
    const complaint = await complaintsService.create(orgAId, actorA, {
      title: 'Concurrency test',
      description: 'Parallel status transitions must be safe.',
      category: ComplaintCategory.IT,
      priority: ComplaintPriority.MEDIUM,
    });

    await complaintsService.assign(orgAId, complaint.id, actorA, {
      assignedToStaffId: staffAId,
    });

    const results = await Promise.allSettled([
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.IN_PROGRESS },
        true,
      ),
      complaintsService.changeStatus(
        orgAId,
        complaint.id,
        actorA,
        { status: ComplaintStatus.IN_PROGRESS },
        true,
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    const refreshed = await complaintsService.findById(orgAId, complaint.id);
    expect(refreshed.status).toBe(ComplaintStatus.IN_PROGRESS);
  });

  it('denies complaint create permission when complaint.create is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['complaint.view']);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['complaint.create']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
