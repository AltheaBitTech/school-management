import { PrismaClient } from '@prisma/client';
import { ORGANIZATION_ROLE_DEFINITIONS } from '../permissions/constants/system-roles';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { ensureOrganizationRole } from './organization-role-seed.util';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('ensureOrganizationRole synchronization', () => {
  let prisma: PrismaClient;
  let organizationId: string;

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

    const organization = await prisma.organization.create({
      data: { name: 'Role Sync School', code: `role-sync-${Date.now()}` },
    });
    organizationId = organization.id;
  });

  afterAll(async () => {
    await prisma.rolePermission.deleteMany({ where: { role: { organizationId } } });
    await prisma.role.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it('converges role permissions to the code definition on repeated runs', async () => {
    const maintenanceDefinition = ORGANIZATION_ROLE_DEFINITIONS.find(
      (role) => role.code === 'MAINTENANCE_STAFF',
    );
    expect(maintenanceDefinition).toBeDefined();

    await ensureOrganizationRole(prisma, organizationId, maintenanceDefinition!);

    const extraPermission = await prisma.permission.findUniqueOrThrow({
      where: { code: 'file.view' },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: {
        organizationId_code: {
          organizationId,
          code: 'MAINTENANCE_STAFF',
        },
      },
    });

    await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: extraPermission.id,
      },
    });

    await ensureOrganizationRole(prisma, organizationId, maintenanceDefinition!);

    const permissionCodes = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      include: { permission: { select: { code: true } } },
    });

    expect(permissionCodes.map((entry) => entry.permission.code).sort()).toEqual(
      [...maintenanceDefinition!.permissions].sort(),
    );
  });
});
