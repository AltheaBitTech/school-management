import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  DepartmentStatus,
  NoticeAudienceType,
  NoticeStatus,
  PrismaClient,
} from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { NoticesService } from './notices.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Notices integration', () => {
  let prisma: PrismaClient;
  let noticesService: NoticesService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let viewerUserId: string;
  let mathDeptAId: string;
  let scienceDeptAId: string;
  let deptBId: string;
  let staffUserAId: string;
  let scienceStaffUserId: string;
  let userBId: string;

  const actorA = {
    userId: '',
    organizationId: '',
    sessionId: 'session-a',
    email: 'admin-a@example.com',
  };

  const actorViewer = {
    userId: '',
    organizationId: '',
    sessionId: 'session-viewer',
    email: 'viewer-a@example.com',
  };

  const actorStaff = {
    userId: '',
    organizationId: '',
    sessionId: 'session-staff',
    email: 'staff-a@example.com',
  };

  const actorScienceStaff = {
    userId: '',
    organizationId: '',
    sessionId: 'session-science-staff',
    email: 'science-staff-a@example.com',
  };

  const actorB = {
    userId: '',
    organizationId: '',
    sessionId: 'session-b',
    email: 'user-b@example.com',
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
      data: { name: 'Notice School A', code: `notice-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Notice School B', code: `notice-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `notice-admin-a-${Date.now()}@example.com` },
    });
    const viewer = await prisma.user.create({
      data: { organizationId: orgAId, email: `notice-viewer-a-${Date.now()}@example.com` },
    });
    const staffUser = await prisma.user.create({
      data: { organizationId: orgAId, email: `notice-staff-a-${Date.now()}@example.com` },
    });
    const scienceStaffUser = await prisma.user.create({
      data: { organizationId: orgAId, email: `notice-science-staff-a-${Date.now()}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `notice-user-b-${Date.now()}@example.com` },
    });

    userAId = userA.id;
    viewerUserId = viewer.id;
    staffUserAId = staffUser.id;
    scienceStaffUserId = scienceStaffUser.id;
    userBId = userB.id;

    actorA.userId = userAId;
    actorA.organizationId = orgAId;
    actorViewer.userId = viewerUserId;
    actorViewer.organizationId = orgAId;
    actorStaff.userId = staffUserAId;
    actorStaff.organizationId = orgAId;
    actorScienceStaff.userId = scienceStaffUserId;
    actorScienceStaff.organizationId = orgAId;
    actorB.userId = userBId;
    actorB.organizationId = orgBId;

    const mathDept = await prisma.department.create({
      data: {
        organizationId: orgAId,
        name: 'Mathematics',
        code: `math-${Date.now()}`,
      },
    });
    const scienceDept = await prisma.department.create({
      data: {
        organizationId: orgAId,
        name: 'Science',
        code: `science-${Date.now()}`,
      },
    });
    const deptB = await prisma.department.create({
      data: {
        organizationId: orgBId,
        name: 'Tenant B Dept',
        code: `dept-b-${Date.now()}`,
      },
    });

    mathDeptAId = mathDept.id;
    scienceDeptAId = scienceDept.id;
    deptBId = deptB.id;

    await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'notice-staff-math',
        firstName: 'Math',
        lastName: 'Teacher',
        userId: staffUserAId,
        departmentId: mathDeptAId,
      },
    });

    await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'notice-staff-science',
        firstName: 'Science',
        lastName: 'Teacher',
        userId: scienceStaffUserId,
        departmentId: scienceDeptAId,
      },
    });

    const noticeNotificationService = {
      notifyPublished: jest.fn().mockResolvedValue(undefined),
    };
    noticesService = new NoticesService(
      prisma as unknown as PrismaService,
      noticeNotificationService as never,
    );
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.noticeRead.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.noticeAudience.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.notice.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.department.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates a valid draft notice with audiences', async () => {
    const notice = await noticesService.create(orgAId, actorA, {
      title: 'School holiday',
      content: 'School will remain closed on Friday.',
      audiences: [{ audienceType: NoticeAudienceType.ENTIRE_SCHOOL }],
    });

    expect(notice.status).toBe(NoticeStatus.DRAFT);
    expect(notice.createdByUserId).toBe(userAId);
    expect(notice.audiences).toHaveLength(1);
  });

  it('requires at least one audience and validates department rules', async () => {
    await expect(
      noticesService.create(orgAId, actorA, {
        title: 'Missing audience',
        content: 'No audience supplied.',
        audiences: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      noticesService.create(orgAId, actorA, {
        title: 'Missing department',
        content: 'Department audience without id.',
        audiences: [{ audienceType: NoticeAudienceType.DEPARTMENT }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      noticesService.create(orgAId, actorA, {
        title: 'Cross tenant department',
        content: 'Invalid department reference.',
        audiences: [{ audienceType: NoticeAudienceType.DEPARTMENT, departmentId: deptBId }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates draft and scheduled notices and rejects published edits', async () => {
    const draft = await noticesService.create(orgAId, actorA, {
      title: 'Draft notice',
      content: 'Initial content.',
      audiences: [{ audienceType: NoticeAudienceType.STAFF }],
    });

    const updated = await noticesService.update(orgAId, draft.id, {
      title: 'Updated draft',
      scheduledAt: new Date(Date.now() + 86_400_000),
    });
    expect(updated.status).toBe(NoticeStatus.SCHEDULED);

    const backToDraft = await noticesService.update(orgAId, draft.id, {
      scheduledAt: null,
    });
    expect(backToDraft.status).toBe(NoticeStatus.DRAFT);

    const published = await noticesService.publish(orgAId, draft.id);
    expect(published.status).toBe(NoticeStatus.PUBLISHED);

    await expect(
      noticesService.update(orgAId, draft.id, { title: 'Should fail' }),
    ).rejects.toBeInstanceOf(ConflictException);

    const archived = await noticesService.archive(orgAId, draft.id);
    expect(archived.status).toBe(NoticeStatus.ARCHIVED);

    await expect(
      noticesService.update(orgAId, draft.id, { title: 'Should fail again' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces lifecycle transitions including early publish rejection', async () => {
    const scheduled = await noticesService.create(orgAId, actorA, {
      title: 'Scheduled notice',
      content: 'Future publish.',
      audiences: [{ audienceType: NoticeAudienceType.ENTIRE_SCHOOL }],
    });

    await noticesService.update(orgAId, scheduled.id, {
      scheduledAt: new Date(Date.now() + 86_400_000),
    });

    await expect(noticesService.publish(orgAId, scheduled.id)).rejects.toBeInstanceOf(
      ConflictException,
    );

    await noticesService.update(orgAId, scheduled.id, {
      scheduledAt: new Date(Date.now() - 60_000),
    });

    const published = await noticesService.publish(orgAId, scheduled.id);
    expect(published.status).toBe(NoticeStatus.PUBLISHED);
    expect(published.publishedAt).not.toBeNull();

    await expect(noticesService.publish(orgAId, scheduled.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('resolves audience visibility for published notices', async () => {
    const deptNotice = await noticesService.create(orgAId, actorA, {
      title: 'Math department only',
      content: 'Department meeting.',
      audiences: [{ audienceType: NoticeAudienceType.DEPARTMENT, departmentId: mathDeptAId }],
    });
    await noticesService.publish(orgAId, deptNotice.id);

    const unionNotice = await noticesService.create(orgAId, actorA, {
      title: 'Math or science',
      content: 'Shared update.',
      audiences: [
        { audienceType: NoticeAudienceType.DEPARTMENT, departmentId: mathDeptAId },
        { audienceType: NoticeAudienceType.DEPARTMENT, departmentId: scienceDeptAId },
      ],
    });
    await noticesService.publish(orgAId, unionNotice.id);

    const staffList = await noticesService.list(orgAId, actorStaff, { page: 1, pageSize: 10 }, false);
    expect(staffList.data.some((item) => item.id === deptNotice.id)).toBe(true);
    expect(staffList.data.some((item) => item.id === unionNotice.id)).toBe(true);

    const viewerList = await noticesService.list(orgAId, actorViewer, { page: 1, pageSize: 10 }, false);
    expect(viewerList.data.some((item) => item.id === deptNotice.id)).toBe(false);
  });

  it('hides drafts from ordinary viewers but allows creator and management visibility', async () => {
    const draft = await noticesService.create(orgAId, actorA, {
      title: 'Hidden draft',
      content: 'Only management should list this.',
      audiences: [{ audienceType: NoticeAudienceType.ENTIRE_SCHOOL }],
    });

    const viewerList = await noticesService.list(orgAId, actorViewer, { page: 1, pageSize: 10 }, false);
    expect(viewerList.data.some((item) => item.id === draft.id)).toBe(false);

    const managementList = await noticesService.list(orgAId, actorA, { page: 1, pageSize: 10 }, true);
    expect(managementList.data.some((item) => item.id === draft.id)).toBe(true);

    await expect(
      noticesService.findById(orgAId, draft.id, actorViewer, false),
    ).rejects.toBeInstanceOf(NotFoundException);

    const creatorView = await noticesService.findById(orgAId, draft.id, actorA, false);
    expect(creatorView.id).toBe(draft.id);
  });

  it('supports read and acknowledge flows for published notices', async () => {
    const notice = await noticesService.create(orgAId, actorA, {
      title: 'Read ack notice',
      content: 'Please acknowledge.',
      audiences: [{ audienceType: NoticeAudienceType.STAFF }],
    });
    await noticesService.publish(orgAId, notice.id);

    const read = noticesService.toDto(await noticesService.markRead(orgAId, notice.id, actorStaff));
    expect(read.readState?.readAt).toBeTruthy();
    expect(read.readState?.acknowledgedAt).toBeNull();

    const readAgain = noticesService.toDto(
      await noticesService.markRead(orgAId, notice.id, actorStaff),
    );
    expect(readAgain.readState?.readAt).toBe(read.readState?.readAt);

    const acknowledged = noticesService.toDto(
      await noticesService.acknowledge(orgAId, notice.id, actorStaff),
    );
    expect(acknowledged.readState?.acknowledgedAt).toBeTruthy();

    const ackAgain = noticesService.toDto(
      await noticesService.acknowledge(orgAId, notice.id, actorStaff),
    );
    expect(ackAgain.readState?.acknowledgedAt).toBe(acknowledged.readState?.acknowledgedAt);
  });

  it('rejects read and acknowledge for unpublished notices and non-audience users', async () => {
    const draft = await noticesService.create(orgAId, actorA, {
      title: 'Draft read',
      content: 'Cannot read yet.',
      audiences: [{ audienceType: NoticeAudienceType.STAFF }],
    });

    await expect(
      noticesService.markRead(orgAId, draft.id, actorStaff),
    ).rejects.toBeInstanceOf(ConflictException);

    await noticesService.publish(orgAId, draft.id);

    await expect(
      noticesService.markRead(orgAId, draft.id, actorViewer),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks direct GET detail access for non-matching department audience', async () => {
    const scienceNotice = await noticesService.create(orgAId, actorA, {
      title: 'Science department only',
      content: 'Science staff meeting.',
      audiences: [{ audienceType: NoticeAudienceType.DEPARTMENT, departmentId: scienceDeptAId }],
    });
    await noticesService.publish(orgAId, scienceNotice.id);

    const scienceView = await noticesService.findById(
      orgAId,
      scienceNotice.id,
      actorScienceStaff,
      false,
    );
    expect(scienceView.id).toBe(scienceNotice.id);

    await expect(
      noticesService.findById(orgAId, scienceNotice.id, actorStaff, false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks cross-tenant read and acknowledge attempts', async () => {
    const notice = await noticesService.create(orgAId, actorA, {
      title: 'Cross-tenant read ack',
      content: 'Tenant B must not read or acknowledge.',
      audiences: [{ audienceType: NoticeAudienceType.ENTIRE_SCHOOL }],
    });
    await noticesService.publish(orgAId, notice.id);

    await expect(
      noticesService.markRead(orgBId, notice.id, actorB),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      noticesService.acknowledge(orgBId, notice.id, actorB),
    ).rejects.toBeInstanceOf(NotFoundException);

    const readRows = await prisma.noticeRead.findMany({
      where: { organizationId: orgBId, noticeId: notice.id },
    });
    expect(readRows).toHaveLength(0);
  });

  it('blocks cross-tenant notice access and mutation', async () => {
    const notice = await noticesService.create(orgAId, actorA, {
      title: 'Tenant isolation',
      content: 'Cross-tenant access must fail.',
      audiences: [{ audienceType: NoticeAudienceType.ENTIRE_SCHOOL }],
    });

    await expect(noticesService.findById(orgBId, notice.id, actorA, true)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      noticesService.update(orgBId, notice.id, { title: 'Cross tenant update' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(noticesService.publish(orgBId, notice.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(noticesService.archive(orgBId, notice.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('handles concurrent publish requests safely', async () => {
    const notice = await noticesService.create(orgAId, actorA, {
      title: 'Concurrent publish',
      content: 'Only one publish should win.',
      audiences: [{ audienceType: NoticeAudienceType.ENTIRE_SCHOOL }],
    });

    const results = await Promise.allSettled([
      noticesService.publish(orgAId, notice.id),
      noticesService.publish(orgAId, notice.id),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.status).toBe('rejected');
    if (rejected[0]?.status === 'rejected') {
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    }

    const finalNotice = await noticesService.findById(orgAId, notice.id, actorA, true);
    expect(finalNotice.status).toBe(NoticeStatus.PUBLISHED);
    expect(finalNotice.publishedAt).not.toBeNull();
  });

  it('serializes concurrent markRead and archive so archived notices are not read afterward', async () => {
    const notice = await noticesService.create(orgAId, actorA, {
      title: 'Concurrent read archive',
      content: 'Read and archive must not race.',
      audiences: [{ audienceType: NoticeAudienceType.STAFF }],
    });
    await noticesService.publish(orgAId, notice.id);

    const results = await Promise.allSettled([
      noticesService.markRead(orgAId, notice.id, actorStaff),
      noticesService.archive(orgAId, notice.id),
    ]);

    expect(results[1].status).toBe('fulfilled');

    const finalNotice = await noticesService.findById(orgAId, notice.id, actorA, true);
    expect(finalNotice.status).toBe(NoticeStatus.ARCHIVED);

    const readRows = await prisma.noticeRead.findMany({
      where: {
        organizationId: orgAId,
        noticeId: notice.id,
        userId: staffUserAId,
      },
    });

    if (results[0].status === 'fulfilled') {
      expect(readRows).toHaveLength(1);
    } else {
      expect(results[0].status).toBe('rejected');
      expect((results[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
      expect(readRows).toHaveLength(0);
    }
  });

  it('serializes concurrent acknowledge and archive so archived notices are not acknowledged afterward', async () => {
    const notice = await noticesService.create(orgAId, actorA, {
      title: 'Concurrent ack archive',
      content: 'Acknowledge and archive must not race.',
      audiences: [{ audienceType: NoticeAudienceType.STAFF }],
    });
    await noticesService.publish(orgAId, notice.id);

    const results = await Promise.allSettled([
      noticesService.acknowledge(orgAId, notice.id, actorStaff),
      noticesService.archive(orgAId, notice.id),
    ]);

    expect(results[1].status).toBe('fulfilled');

    const finalNotice = await noticesService.findById(orgAId, notice.id, actorA, true);
    expect(finalNotice.status).toBe(NoticeStatus.ARCHIVED);

    const readRows = await prisma.noticeRead.findMany({
      where: {
        organizationId: orgAId,
        noticeId: notice.id,
        userId: staffUserAId,
      },
    });

    if (results[0].status === 'fulfilled') {
      expect(readRows).toHaveLength(1);
      expect(readRows[0]?.acknowledgedAt).not.toBeNull();
    } else {
      expect(results[0].status).toBe('rejected');
      expect((results[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
      expect(readRows).toHaveLength(0);
    }
  });

  it('rejects inactive departments for audience targeting', async () => {
    const inactiveDept = await prisma.department.create({
      data: {
        organizationId: orgAId,
        name: 'Inactive Dept',
        code: `inactive-${Date.now()}`,
        status: DepartmentStatus.INACTIVE,
      },
    });

    await expect(
      noticesService.create(orgAId, actorA, {
        title: 'Inactive department audience',
        content: 'Should fail validation.',
        audiences: [
          { audienceType: NoticeAudienceType.DEPARTMENT, departmentId: inactiveDept.id },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('denies notice update permission when notice.update is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['notice.view', 'notice.create']);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['notice.update']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies notice create permission when notice.create is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['notice.view']);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['notice.create']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
