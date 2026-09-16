import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AssetCategoryStatus,
  AssetHistoryEvent,
  AssetStatus,
  DepartmentStatus,
  EmploymentStatus,
  MaintenanceType,
  PrismaClient,
} from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Assets integration', () => {
  let prisma: PrismaClient;
  let assetsService: AssetsService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let staffAId: string;
  let staffA2Id: string;
  let staffBId: string;
  let offboardedStaffAId: string;
  let inactiveStaffAId: string;
  let deptAId: string;
  let deptBId: string;
  let inactiveDeptAId: string;
  let activeCategoryAId: string;
  let inactiveCategoryAId: string;
  let categoryBId: string;

  const actorA = {
    userId: '',
    organizationId: '',
    sessionId: 'session-a',
    email: 'admin-a@example.com',
  };

  const actorB = {
    userId: '',
    organizationId: '',
    sessionId: 'session-b',
    email: 'admin-b@example.com',
  };

  const baseCreatePayload = {
    name: 'Dell Latitude Laptop',
    description: 'IT department laptop',
  };

  async function createAvailableAsset(nameSuffix = '') {
    return assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: `${baseCreatePayload.name}${nameSuffix}`,
      categoryId: activeCategoryAId,
    });
  }

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
      data: { name: 'Asset School A', code: `asset-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Asset School B', code: `asset-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `asset-user-a-${Date.now()}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `asset-user-b-${Date.now()}@example.com` },
    });
    userAId = userA.id;
    userBId = userB.id;

    actorA.userId = userAId;
    actorA.organizationId = orgAId;
    actorB.userId = userBId;
    actorB.organizationId = orgBId;

    const deptA = await prisma.department.create({
      data: { organizationId: orgAId, name: 'IT', code: 'IT-A' },
    });
    const deptB = await prisma.department.create({
      data: { organizationId: orgBId, name: 'IT', code: 'IT-B' },
    });
    const inactiveDept = await prisma.department.create({
      data: {
        organizationId: orgAId,
        name: 'Inactive Dept',
        code: 'INACTIVE-A',
        status: DepartmentStatus.INACTIVE,
      },
    });
    deptAId = deptA.id;
    deptBId = deptB.id;
    inactiveDeptAId = inactiveDept.id;

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'asset-staff-a',
        firstName: 'Assignee',
        lastName: 'StaffA',
      },
    });
    const staffA2 = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'asset-staff-a2',
        firstName: 'Second',
        lastName: 'StaffA',
      },
    });
    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: 'asset-staff-b',
        firstName: 'Assignee',
        lastName: 'StaffB',
      },
    });
    const offboardedStaff = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'asset-offboarded',
        firstName: 'Offboarded',
        lastName: 'Staff',
        employmentStatus: EmploymentStatus.OFFBOARDED,
      },
    });
    const inactiveStaff = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'asset-inactive',
        firstName: 'Inactive',
        lastName: 'Staff',
        employmentStatus: EmploymentStatus.OFFBOARDING,
      },
    });

    staffAId = staffA.id;
    staffA2Id = staffA2.id;
    staffBId = staffB.id;
    offboardedStaffAId = offboardedStaff.id;
    inactiveStaffAId = inactiveStaff.id;

    const activeCategory = await prisma.assetCategory.create({
      data: {
        organizationId: orgAId,
        name: 'Laptops',
        code: 'LAPTOPS',
        status: AssetCategoryStatus.ACTIVE,
      },
    });
    const inactiveCategory = await prisma.assetCategory.create({
      data: {
        organizationId: orgAId,
        name: 'Inactive Category',
        code: 'INACTIVE_CAT',
        status: AssetCategoryStatus.INACTIVE,
      },
    });
    const categoryB = await prisma.assetCategory.create({
      data: {
        organizationId: orgBId,
        name: 'Laptops',
        code: 'LAPTOPS',
        status: AssetCategoryStatus.ACTIVE,
      },
    });
    activeCategoryAId = activeCategory.id;
    inactiveCategoryAId = inactiveCategory.id;
    categoryBId = categoryB.id;

    assetsService = new AssetsService(prisma as unknown as PrismaService);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.assetHistory.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.assetMaintenance.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.assetTransfer.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.asset.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.assetCategory.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.department.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('seeds default categories when none exist for the organization', async () => {
    const emptyOrg = await prisma.organization.create({
      data: { name: 'Category Seed Org', code: `asset-cat-seed-${Date.now()}` },
    });

    const listed = await assetsService.listCategories(emptyOrg.id);

    expect(listed.data.length).toBe(8);
    expect(listed.data.every((category) => category.status === 'ACTIVE')).toBe(true);
    expect(listed.data.some((category) => category.code === 'LAPTOPS')).toBe(true);

    await prisma.assetCategory.deleteMany({ where: { organizationId: emptyOrg.id } });
    await prisma.organization.delete({ where: { id: emptyOrg.id } });
  });

  it('creates an available asset with generated code and CREATED history', async () => {
    const asset = await createAvailableAsset(' available');

    expect(asset.organizationId).toBe(orgAId);
    expect(asset.assetCode).toBe('AST-000001');
    expect(asset.status).toBe(AssetStatus.AVAILABLE);
    expect(asset.createdByUserId).toBe(userAId);
    expect(asset.assignedStaffId).toBeNull();
    expect(asset.history.some((entry) => entry.eventType === AssetHistoryEvent.CREATED)).toBe(true);
  });

  it('creates an assigned asset with ASSIGNED history', async () => {
    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Assigned on create',
      categoryId: activeCategoryAId,
      assignedStaffId: staffAId,
    });

    expect(asset.status).toBe(AssetStatus.ASSIGNED);
    expect(asset.assignedStaffId).toBe(staffAId);
    expect(asset.history.some((entry) => entry.eventType === AssetHistoryEvent.ASSIGNED)).toBe(
      true,
    );
  });

  it('accepts active same-tenant category and rejects inactive category', async () => {
    await expect(
      assetsService.create(orgAId, actorA, {
        ...baseCreatePayload,
        name: 'Inactive category asset',
        categoryId: inactiveCategoryAId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Active category asset',
      categoryId: activeCategoryAId,
    });
    expect(asset.categoryId).toBe(activeCategoryAId);
  });

  it('rejects cross-tenant category', async () => {
    await expect(
      assetsService.create(orgAId, actorA, {
        ...baseCreatePayload,
        name: 'Cross tenant category',
        categoryId: categoryBId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate serial number within tenant and allows across tenants', async () => {
    await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Serial A1',
      categoryId: activeCategoryAId,
      serialNumber: 'SN-UNIQUE-001',
    });

    await expect(
      assetsService.create(orgAId, actorA, {
        ...baseCreatePayload,
        name: 'Serial A2',
        categoryId: activeCategoryAId,
        serialNumber: 'SN-UNIQUE-001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const tenantBAsset = await assetsService.create(orgBId, actorB, {
      ...baseCreatePayload,
      name: 'Serial B1',
      categoryId: categoryBId,
      serialNumber: 'SN-UNIQUE-001',
    });
    expect(tenantBAsset.serialNumber).toBe('SN-UNIQUE-001');
  });

  it('rejects duplicate barcode and qr code within tenant', async () => {
    await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Barcode asset',
      categoryId: activeCategoryAId,
      barcode: 'BC-001',
    });

    await expect(
      assetsService.create(orgAId, actorA, {
        ...baseCreatePayload,
        name: 'Duplicate barcode',
        categoryId: activeCategoryAId,
        barcode: 'BC-001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'QR asset',
      categoryId: activeCategoryAId,
      qrCode: 'QR-001',
    });

    await expect(
      assetsService.create(orgAId, actorA, {
        ...baseCreatePayload,
        name: 'Duplicate QR',
        categoryId: activeCategoryAId,
        qrCode: 'QR-001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('assigns an available asset to active staff', async () => {
    const asset = await createAvailableAsset(' assign');
    const assigned = await assetsService.assign(orgAId, asset.id, actorA, { staffId: staffAId });

    expect(assigned.status).toBe(AssetStatus.ASSIGNED);
    expect(assigned.assignedStaffId).toBe(staffAId);
    expect(assigned.history.some((entry) => entry.eventType === AssetHistoryEvent.ASSIGNED)).toBe(
      true,
    );
  });

  it('rejects assignment to cross-tenant, offboarded, and inactive staff', async () => {
    const asset = await createAvailableAsset(' staff validation');

    await expect(
      assetsService.assign(orgAId, asset.id, actorA, { staffId: staffBId }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      assetsService.assign(orgAId, asset.id, actorA, { staffId: offboardedStaffAId }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      assetsService.assign(orgAId, asset.id, actorA, { staffId: inactiveStaffAId }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assignment on retired and maintenance assets', async () => {
    const retired = await createAvailableAsset(' retired assign');
    await assetsService.retire(orgAId, retired.id, actorA, { reason: 'End of life' });

    await expect(
      assetsService.assign(orgAId, retired.id, actorA, { staffId: staffAId }),
    ).rejects.toBeInstanceOf(ConflictException);

    const maintenanceAsset = await createAvailableAsset(' maintenance assign');
    await assetsService.startMaintenance(orgAId, maintenanceAsset.id, actorA, {
      maintenanceType: MaintenanceType.REPAIR,
      description: 'Screen repair',
    });

    await expect(
      assetsService.assign(orgAId, maintenanceAsset.id, actorA, { staffId: staffAId }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('unassigns an assigned asset and rejects non-assigned assets', async () => {
    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Unassign test',
      categoryId: activeCategoryAId,
      assignedStaffId: staffAId,
    });

    const unassigned = await assetsService.unassign(orgAId, asset.id, actorA);
    expect(unassigned.status).toBe(AssetStatus.AVAILABLE);
    expect(unassigned.assignedStaffId).toBeNull();
    expect(
      unassigned.history.some((entry) => entry.eventType === AssetHistoryEvent.UNASSIGNED),
    ).toBe(true);

    await expect(assetsService.unassign(orgAId, asset.id, actorA)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('transfers asset within tenant and records transfer history', async () => {
    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Transfer test',
      categoryId: activeCategoryAId,
      assignedStaffId: staffAId,
      departmentId: deptAId,
      location: 'Room 101',
    });

    const transferred = await assetsService.transfer(orgAId, asset.id, actorA, {
      departmentId: deptAId,
      location: 'Room 202',
      staffId: staffA2Id,
      reason: 'Moved to new office',
    });

    expect(transferred.location).toBe('Room 202');
    expect(transferred.assignedStaffId).toBe(staffA2Id);
    expect(transferred.transfers).toHaveLength(1);
    expect(
      transferred.history.some((entry) => entry.eventType === AssetHistoryEvent.TRANSFERRED),
    ).toBe(true);
  });

  it('rejects transfer with cross-tenant department or staff and inactive destinations', async () => {
    const asset = await createAvailableAsset(' transfer reject');

    await expect(
      assetsService.transfer(orgAId, asset.id, actorA, { departmentId: deptBId }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      assetsService.transfer(orgAId, asset.id, actorA, { staffId: staffBId }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      assetsService.transfer(orgAId, asset.id, actorA, { departmentId: inactiveDeptAId }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const retired = await createAvailableAsset(' transfer retired');
    await assetsService.retire(orgAId, retired.id, actorA, { reason: 'Retired' });
    await expect(
      assetsService.transfer(orgAId, retired.id, actorA, { location: 'Nowhere' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('starts and completes maintenance, clearing assignment on start', async () => {
    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Maintenance lifecycle',
      categoryId: activeCategoryAId,
      assignedStaffId: staffAId,
    });

    const inMaintenance = await assetsService.startMaintenance(orgAId, asset.id, actorA, {
      maintenanceType: MaintenanceType.SERVICE,
      description: 'Annual service',
    });

    expect(inMaintenance.status).toBe(AssetStatus.UNDER_MAINTENANCE);
    expect(inMaintenance.assignedStaffId).toBeNull();
    expect(inMaintenance.maintenances).toHaveLength(1);

    const maintenanceId = inMaintenance.maintenances[0]!.id;
    const completed = await assetsService.completeMaintenance(
      orgAId,
      asset.id,
      maintenanceId,
      actorA,
    );

    expect(completed.status).toBe(AssetStatus.AVAILABLE);
    expect(completed.assignedStaffId).toBeNull();
    expect(completed.maintenances[0]?.completedAt).not.toBeNull();

    await expect(
      assetsService.completeMaintenance(orgAId, asset.id, maintenanceId, actorA),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('retires an asset, clears assignment, and rejects repeat retirement', async () => {
    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Retire test',
      categoryId: activeCategoryAId,
      assignedStaffId: staffAId,
    });

    const before = Date.now();
    const retired = await assetsService.retire(orgAId, asset.id, actorA, {
      reason: 'Beyond economical repair',
    });
    const after = Date.now();

    expect(retired.status).toBe(AssetStatus.RETIRED);
    expect(retired.assignedStaffId).toBeNull();
    expect(retired.retirementReason).toBe('Beyond economical repair');
    expect(retired.retiredAt).not.toBeNull();
    expect(retired.retiredAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(retired.retiredAt!.getTime()).toBeLessThanOrEqual(after);

    await expect(
      assetsService.retire(orgAId, asset.id, actorA, { reason: 'Again' }),
    ).rejects.toBeInstanceOf(ConflictException);

    const readable = await assetsService.findById(orgAId, asset.id);
    expect(readable.status).toBe(AssetStatus.RETIRED);
  });

  it('blocks cross-tenant list, detail, history, and mutation access', async () => {
    const asset = await createAvailableAsset(' tenant isolation');

    const tenantBList = await assetsService.list(orgBId, { page: 1, pageSize: 50 });
    expect(tenantBList.data.some((item) => item.id === asset.id)).toBe(false);

    await expect(assetsService.findById(orgBId, asset.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(assetsService.listHistory(orgBId, asset.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      assetsService.assign(orgBId, asset.id, actorB, { staffId: staffBId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(assetsService.unassign(orgBId, asset.id, actorB)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      assetsService.transfer(orgBId, asset.id, actorB, { location: 'Elsewhere' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      assetsService.startMaintenance(orgBId, asset.id, actorB, {
        maintenanceType: MaintenanceType.REPAIR,
        description: 'Repair',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      assetsService.retire(orgBId, asset.id, actorB, { reason: 'Retire' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns correct pagination metadata and treats whitespace-only search as no search', async () => {
    const prefix = `asset-pag-${Date.now()}`;

    for (let index = 1; index <= 12; index += 1) {
      await assetsService.create(orgAId, actorA, {
        ...baseCreatePayload,
        name: `${prefix} Asset ${index}`,
        categoryId: activeCategoryAId,
      });
    }

    const listed = await assetsService.list(orgAId, {
      page: 1,
      pageSize: 10,
      search: prefix,
    });

    expect(listed.meta.page).toBe(1);
    expect(listed.meta.pageSize).toBe(10);
    expect(listed.meta.total).toBe(12);
    expect(listed.meta.totalPages).toBe(2);
    expect(listed.data).toHaveLength(10);

    const whitespaceSearch = await assetsService.list(orgAId, {
      page: 1,
      pageSize: 100,
      search: '   ',
    });
    expect(whitespaceSearch.data.length).toBeGreaterThan(0);
  });

  it('allows only one concurrent retirement', async () => {
    const asset = await createAvailableAsset(' concurrent retire');

    const results = await Promise.allSettled([
      assetsService.retire(orgAId, asset.id, actorA, { reason: 'Retire A' }),
      assetsService.retire(orgAId, asset.id, actorA, { reason: 'Retire B' }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    const refreshed = await assetsService.findById(orgAId, asset.id);
    expect(refreshed.status).toBe(AssetStatus.RETIRED);
    expect(
      refreshed.history.filter((entry) => entry.eventType === AssetHistoryEvent.RETIRED),
    ).toHaveLength(1);
  });

  it('serializes concurrent assignment and retirement', async () => {
    const asset = await createAvailableAsset(' assign vs retire');

    const results = await Promise.allSettled([
      assetsService.assign(orgAId, asset.id, actorA, { staffId: staffAId }),
      assetsService.retire(orgAId, asset.id, actorA, { reason: 'Retire during assign' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);

    const refreshed = await assetsService.findById(orgAId, asset.id);
    expect(refreshed.status).toBe(AssetStatus.RETIRED);
    expect(refreshed.assignedStaffId).toBeNull();
    expect(
      refreshed.history.filter((entry) => entry.eventType === AssetHistoryEvent.RETIRED),
    ).toHaveLength(1);
  });

  it('serializes concurrent maintenance start and retirement', async () => {
    const asset = await createAvailableAsset(' maintenance vs retire');

    const results = await Promise.allSettled([
      assetsService.startMaintenance(orgAId, asset.id, actorA, {
        maintenanceType: MaintenanceType.REPAIR,
        description: 'Repair',
      }),
      assetsService.retire(orgAId, asset.id, actorA, { reason: 'Retire during maintenance' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);

    const refreshed = await assetsService.findById(orgAId, asset.id);
    expect([AssetStatus.UNDER_MAINTENANCE, AssetStatus.RETIRED]).toContain(refreshed.status);
    if (refreshed.status === AssetStatus.RETIRED) {
      expect(
        refreshed.history.filter((entry) => entry.eventType === AssetHistoryEvent.RETIRED),
      ).toHaveLength(1);
    }
  });

  it('serializes concurrent transfer and retirement', async () => {
    const asset = await createAvailableAsset(' transfer vs retire');

    const results = await Promise.allSettled([
      assetsService.transfer(orgAId, asset.id, actorA, { location: 'New location' }),
      assetsService.retire(orgAId, asset.id, actorA, { reason: 'Retire during transfer' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);

    const refreshed = await assetsService.findById(orgAId, asset.id);
    expect(refreshed.status).toBe(AssetStatus.RETIRED);
    expect(
      refreshed.history.filter((entry) => entry.eventType === AssetHistoryEvent.RETIRED),
    ).toHaveLength(1);
  });

  it('patches an available asset and persists metadata changes', async () => {
    const asset = await createAvailableAsset(' patch available');
    const updated = await assetsService.update(orgAId, asset.id, {
      name: 'Updated Laptop Name',
      description: 'Updated description',
      location: 'Room 303',
      serialNumber: 'SN-PATCH-001',
    });

    expect(updated.name).toBe('Updated Laptop Name');
    expect(updated.description).toBe('Updated description');
    expect(updated.location).toBe('Room 303');
    expect(updated.serialNumber).toBe('SN-PATCH-001');
    expect(updated.status).toBe(AssetStatus.AVAILABLE);
    expect(updated.assignedStaffId).toBeNull();
  });

  it('patches an assigned asset without changing assignment or status', async () => {
    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Assigned patch target',
      categoryId: activeCategoryAId,
      assignedStaffId: staffAId,
    });

    const updated = await assetsService.update(orgAId, asset.id, {
      location: 'Room 404',
    });

    expect(updated.status).toBe(AssetStatus.ASSIGNED);
    expect(updated.assignedStaffId).toBe(staffAId);
    expect(updated.location).toBe('Room 404');
  });

  it('patches an under-maintenance asset without changing maintenance state', async () => {
    const asset = await createAvailableAsset(' patch maintenance');
    await assetsService.startMaintenance(orgAId, asset.id, actorA, {
      maintenanceType: MaintenanceType.REPAIR,
      description: 'Screen repair',
    });

    const updated = await assetsService.update(orgAId, asset.id, {
      description: 'Updated asset notes during maintenance',
    });

    expect(updated.status).toBe(AssetStatus.UNDER_MAINTENANCE);
    expect(updated.description).toBe('Updated asset notes during maintenance');
  });

  it('rejects patching a retired asset', async () => {
    const asset = await createAvailableAsset(' patch retired');
    await assetsService.retire(orgAId, asset.id, actorA, { reason: 'End of life' });

    await expect(
      assetsService.update(orgAId, asset.id, { name: 'Should not update' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects cross-tenant metadata patch attempts', async () => {
    const asset = await createAvailableAsset(' patch tenant');

    await expect(
      assetsService.update(orgBId, asset.id, { name: 'Cross tenant patch' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid metadata and whitespace-only patch values', async () => {
    const asset = await createAvailableAsset(' patch validation');

    await expect(
      assetsService.update(orgAId, asset.id, {
        warrantyStartDate: '2026-01-01',
        warrantyEndDate: '2025-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      assetsService.update(orgAId, asset.id, { name: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      assetsService.retire(orgAId, asset.id, actorA, { reason: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      assetsService.startMaintenance(orgAId, asset.id, actorA, {
        maintenanceType: MaintenanceType.REPAIR,
        description: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not change lifecycle fields through metadata patch', async () => {
    const asset = await assetsService.create(orgAId, actorA, {
      ...baseCreatePayload,
      name: 'Lifecycle patch guard',
      categoryId: activeCategoryAId,
      assignedStaffId: staffAId,
      departmentId: deptAId,
    });

    const updated = await assetsService.update(orgAId, asset.id, {
      name: 'Lifecycle patch guard updated',
    });

    expect(updated.status).toBe(AssetStatus.ASSIGNED);
    expect(updated.assignedStaffId).toBe(staffAId);
    expect(updated.departmentId).toBe(deptAId);
    expect(updated.retiredAt).toBeNull();
    expect(updated.assetCode).toBe(asset.assetCode);
  });

  it('serializes concurrent metadata patch and retirement without post-retire mutation', async () => {
    const asset = await createAvailableAsset(' patch vs retire hardening');
    const originalName = asset.name;
    const patchedName = `${originalName} Updated`;

    const results = await Promise.allSettled([
      assetsService.update(orgAId, asset.id, { name: patchedName }),
      assetsService.retire(orgAId, asset.id, actorA, { reason: 'Retire during patch' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled').length).toBeGreaterThanOrEqual(
      1,
    );

    const refreshed = await assetsService.findById(orgAId, asset.id);
    expect(refreshed.status).toBe(AssetStatus.RETIRED);

    const patchResult = results[0];
    if (patchResult.status === 'rejected') {
      expect(patchResult.reason).toBeInstanceOf(ConflictException);
      expect(refreshed.name).toBe(originalName);
    }

    await expect(
      assetsService.update(orgAId, asset.id, { name: 'Post-retire patch attempt' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates unique asset codes under concurrent creation', async () => {
    const prefix = Date.now();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, index) =>
        assetsService.create(orgAId, actorA, {
          ...baseCreatePayload,
          name: `Concurrent code ${prefix}-${index}`,
          categoryId: activeCategoryAId,
        }),
      ),
    );

    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof assetsService.create>>> =>
        result.status === 'fulfilled',
    );

    expect(fulfilled).toHaveLength(5);
    const codes = fulfilled.map((result) => result.value.assetCode);
    expect(new Set(codes).size).toBe(5);
    codes.forEach((code) => expect(code).toMatch(/^AST-[0-9]{6}$/));
  });

  const assetPermissions = [
    'asset.view',
    'asset.create',
    'asset.update',
    'asset.assign',
    'asset.transfer',
    'asset.maintenance',
    'asset.retire',
  ] as const;

  it.each(assetPermissions)('denies %s when permission is missing', async (permissionCode) => {
    jest.spyOn(permissionsService, 'getEffectivePermissions').mockResolvedValueOnce([]);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([permissionCode]);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
