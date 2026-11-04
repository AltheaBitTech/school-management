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

  const permissions = await client.permission.findMany({
    where: { code: { in: roleDefinition.permissions } },
    select: { id: true, code: true },
  });

  if (permissions.length !== roleDefinition.permissions.length) {
    const foundCodes = new Set(permissions.map((permission) => permission.code));
    const missingCode = roleDefinition.permissions.find((code) => !foundCodes.has(code));
    throw new Error(`Missing permission definition for ${missingCode ?? 'unknown'}`);
  }

  const desiredPermissionIds = permissions.map((permission) => permission.id);

  await client.rolePermission.deleteMany({
    where: {
      roleId: role.id,
      permissionId: { notIn: desiredPermissionIds },
    },
  });

  await client.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  return role;
}

export async function ensureAllOrganizationRoles(
  client: PrismaClientLike,
  organizationId: string,
): Promise<void> {
  for (const roleDefinition of ORGANIZATION_ROLE_DEFINITIONS) {
    await ensureOrganizationRole(client, organizationId, roleDefinition);
  }
}

export async function getOrganizationRoleByCode(
  client: PrismaClientLike,
  organizationId: string,
  roleCode: string,
): Promise<{ id: string; code: string }> {
  const role = await client.role.findUnique({
    where: {
      organizationId_code: {
        organizationId,
        code: roleCode,
      },
    },
    select: { id: true, code: true },
  });

  if (!role) {
    throw new Error(`Organization role ${roleCode} was not found for organization ${organizationId}`);
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

export async function ensureStaffRole(
  client: PrismaClientLike,
  organizationId: string,
): Promise<{ id: string; code: string }> {
  const staffDefinition = ORGANIZATION_ROLE_DEFINITIONS.find(
    (role: SystemRoleDefinition) => role.code === ORGANIZATION_ROLE_CODES.STAFF,
  );

  if (!staffDefinition) {
    throw new Error('STAFF role definition is unavailable');
  }

  return ensureOrganizationRole(client, organizationId, staffDefinition);
}
