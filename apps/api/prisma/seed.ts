import { PrismaClient } from '@prisma/client';
import { ensureDefaultAssetCategories } from '../src/assets/utils/asset-category-seed.util';
import {
  ORGANIZATION_ROLE_DEFINITIONS,
  PLATFORM_ROLE_DEFINITIONS,
} from '../src/permissions/constants/system-roles';
import { SYSTEM_PERMISSIONS } from '../src/permissions/constants/system-permissions';

const prisma = new PrismaClient();

async function seedPermissions(): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();

  for (const permission of SYSTEM_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        description: permission.description,
      },
      create: {
        code: permission.code,
        description: permission.description,
      },
    });

    permissionIds.set(record.code, record.id);
  }

  return permissionIds;
}

async function seedPlatformRoles(permissionIds: Map<string, string>): Promise<void> {
  for (const roleDefinition of PLATFORM_ROLE_DEFINITIONS) {
    const existingRole = await prisma.role.findFirst({
      where: {
        code: roleDefinition.code,
        organizationId: null,
      },
    });

    const role = existingRole
      ? await prisma.role.update({
          where: { id: existingRole.id },
          data: { name: roleDefinition.name },
        })
      : await prisma.role.create({
          data: {
            organizationId: null,
            code: roleDefinition.code,
            name: roleDefinition.name,
          },
        });

    for (const permissionCode of roleDefinition.permissions) {
      const permissionId = permissionIds.get(permissionCode);

      if (!permissionId) {
        throw new Error(`Missing permission definition for ${permissionCode}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }
}

async function seedOrganizationRoles(
  organizationId: string,
  permissionIds: Map<string, string>,
): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error(
      `Organization ${organizationId} was not found. Create the organization before seeding org roles.`,
    );
  }

  for (const roleDefinition of ORGANIZATION_ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_code: {
          organizationId,
          code: roleDefinition.code,
        },
      },
      update: {
        name: roleDefinition.name,
      },
      create: {
        organizationId,
        code: roleDefinition.code,
        name: roleDefinition.name,
      },
    });

    for (const permissionCode of roleDefinition.permissions) {
      const permissionId = permissionIds.get(permissionCode);

      if (!permissionId) {
        throw new Error(`Missing permission definition for ${permissionCode}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  const permissionIds = await seedPermissions();
  await seedPlatformRoles(permissionIds);

  const organizationId = process.env.SEED_ORGANIZATION_ID;

  if (organizationId) {
    await seedOrganizationRoles(organizationId, permissionIds);
    await ensureDefaultAssetCategories(prisma, organizationId);
    console.log(`Seeded organization roles for organization ${organizationId}`);
    console.log(`Seeded default asset categories for organization ${organizationId}`);
  } else {
    console.log(
      'Skipped organization role seeding. Set SEED_ORGANIZATION_ID to seed SCHOOL_ADMIN for an existing organization.',
    );
  }

  console.log('RBAC seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('RBAC seed failed.', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
