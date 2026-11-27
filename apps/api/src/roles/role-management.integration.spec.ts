import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ORGANIZATION_ROLE_DEFINITIONS } from '../permissions/constants/system-roles';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ensureAllOrganizationRoles, ensureOrganizationRole } from './organization-role-seed.util';
import { ROLE_MANAGEMENT_ERROR_CODES, RoleManagementService } from './role-management.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Role management integration', () => {
  let prisma: PrismaClient;
  let permissionsService: PermissionsService;
  let service: RoleManagementService;
  let organizationId: string;
  let otherOrganizationId: string;
  let adminUserId: string;
  let staffUserId: string;
  let adminRoleId: string;

  const actor = () => ({
    userId: adminUserId,
    organizationId,
    sessionId: 'session',
    email: 'admin@example.com',
    activeRoleId: adminRoleId,
  });

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

    const stamp = Date.now();
    const [organization, other] = await Promise.all([
      prisma.organization.create({ data: { name: 'Roles School', code: `roles-${stamp}` } }),
      prisma.organization.create({ data: { name: 'Other School', code: `roles-other-${stamp}` } }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = other.id;
    await ensureAllOrganizationRoles(prisma, organizationId);
    await ensureAllOrganizationRoles(prisma, otherOrganizationId);

    adminRoleId = (
      await prisma.role.findUniqueOrThrow({
        where: { organizationId_code: { organizationId, code: 'SCHOOL_ADMIN' } },
      })
    ).id;
    const [admin, staff] = await Promise.all([
      prisma.user.create({ data: { organizationId, email: `roles-admin-${stamp}@example.com` } }),
      prisma.user.create({ data: { organizationId, email: `roles-staff-${stamp}@example.com` } }),
    ]);
    adminUserId = admin.id;
    staffUserId = staff.id;
    await prisma.userRole.create({ data: { userId: adminUserId, roleId: adminRoleId } });

    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    service = new RoleManagementService(
      prisma as unknown as PrismaService,
      permissionsService,
      new AuditService(prisma as unknown as PrismaService),
    );
  });

  afterAll(async () => {
    const orgIds = [organizationId, otherOrganizationId];
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: [adminUserId, staffUserId] } } });
    await prisma.rolePermission.deleteMany({ where: { role: { organizationId: { in: orgIds } } } });
    await prisma.role.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, staffUserId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('creates a custom role whose permissions take effect immediately', async () => {
    const librarian = await service.createRole(actor(), {
      name: 'Librarian',
      permissions: ['notice.view', 'file.view'],
    });
    expect(librarian.code).toBe('CUSTOM_LIBRARIAN');
    expect(librarian.isSystem).toBe(false);

    await prisma.userRole.create({ data: { userId: staffUserId, roleId: librarian.id } });
    const can = (codes: string[]) =>
      permissionsService.userHasAllPermissions(staffUserId, organizationId, codes, librarian.id);

    expect(await can(['notice.view'])).toBe(true);
    expect(await can(['fee.view'])).toBe(false);

    await service.updateRole(actor(), librarian.id, {
      permissions: ['notice.view', 'file.view', 'fee.view'],
    });
    expect(await can(['fee.view'])).toBe(true);

    await expect(service.deleteRole(actor(), librarian.id)).rejects.toMatchObject({
      response: { code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_IN_USE },
    });

    const audit = await prisma.auditLog.findMany({
      where: { organizationId, entityId: librarian.id },
      select: { action: true },
    });
    expect(audit.map((entry) => entry.action).sort()).toEqual(['ROLE_CREATED', 'ROLE_UPDATED']);
  });

  it('keeps edits to a built-in role across re-seeding, and reset restores defaults', async () => {
    const teacher = await prisma.role.findUniqueOrThrow({
      where: { organizationId_code: { organizationId, code: 'TEACHER' } },
    });
    const definition = ORGANIZATION_ROLE_DEFINITIONS.find((role) => role.code === 'TEACHER')!;

    const edited = await service.updateRole(actor(), teacher.id, {
      permissions: [...definition.permissions.filter((code) => code !== 'file.create'), 'fee.view'],
    });
    expect(edited.isCustomized).toBe(true);

    await ensureOrganizationRole(prisma, organizationId, definition);
    const afterSeed = await service.getRole(organizationId, teacher.id);
    expect(afterSeed.permissions).toContain('fee.view');
    expect(afterSeed.permissions).not.toContain('file.create');

    const reset = await service.resetRole(actor(), teacher.id);
    expect(reset.isCustomized).toBe(false);
    expect(reset.permissions).toEqual([...definition.permissions].sort());
  });

  it('cannot read or edit another school’s roles', async () => {
    const otherTeacher = await prisma.role.findUniqueOrThrow({
      where: { organizationId_code: { organizationId: otherOrganizationId, code: 'TEACHER' } },
    });

    await expect(service.getRole(organizationId, otherTeacher.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.updateRole(actor(), otherTeacher.id, { permissions: [] }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('deletes an unused custom role', async () => {
    const temp = await service.createRole(actor(), { name: 'Temp helper', permissions: [] });
    await service.deleteRole(actor(), temp.id);
    expect(await prisma.role.findUnique({ where: { id: temp.id } })).toBeNull();
  });
});
