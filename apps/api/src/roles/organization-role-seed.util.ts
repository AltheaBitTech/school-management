import { Prisma } from '@prisma/client';
import {
  ORGANIZATION_ROLE_DEFINITIONS,
  ORGANIZATION_ROLE_CODES,
  SystemRoleDefinition,
} from '../permissions/constants/system-roles';

type PrismaClientLike = Prisma.TransactionClient | {
  role: Prisma.TransactionClient['role'];
  permission: Prisma.TransactionClient['permission'];
  rolePermission: Prisma.TransactionClient['rolePermission'];
};

export async function ensureOrganizationRole(
  client: PrismaClientLike,
  organizationId: string,
  roleDefinition: SystemRoleDefinition,
): Promise<{ id: string; code: string }> {
  const role = await client.role.upsert({
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
    const permission = await client.permission.findUnique({
      where: { code: permissionCode },
    });

    if (!permission) {
      throw new Error(`Missing permission definition for ${permissionCode}`);
    }

    await client.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }

  return role;
}

export async function ensureSchoolAdminRole(
  client: PrismaClientLike,
  organizationId: string,
): Promise<{ id: string; code: string }> {
  const schoolAdminDefinition = ORGANIZATION_ROLE_DEFINITIONS.find(
    (role: SystemRoleDefinition) => role.code === ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
  );

  if (!schoolAdminDefinition) {
    throw new Error('SCHOOL_ADMIN role definition is unavailable');
  }

  return ensureOrganizationRole(client, organizationId, schoolAdminDefinition);
}
