import { PrismaClient, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PLATFORM_ORGANIZATION_CODE } from '../src/organizations/constants/organization.constants';
import { normalizeEmail } from '../src/auth/utils/email.util';
import { PLATFORM_ROLE_CODES } from '../src/permissions/constants/system-roles';
import { SYSTEM_PERMISSIONS } from '../src/permissions/constants/system-permissions';

const prisma = new PrismaClient();

async function ensurePermissions(): Promise<void> {
  for (const permission of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission,
    });
  }
}

async function ensurePlatformRole(): Promise<string> {
  const roleDefinition = {
    code: PLATFORM_ROLE_CODES.SAAS_SUPER_ADMIN,
    name: 'SaaS Super Admin',
    permissions: [
      'platform.organization.view',
      'platform.organization.create',
      'platform.role.assign',
      'audit.view',
    ],
  };

  const existingRole = await prisma.role.findFirst({
    where: { code: roleDefinition.code, organizationId: null },
  });

  const role =
    existingRole ??
    (await prisma.role.create({
      data: {
        organizationId: null,
        code: roleDefinition.code,
        name: roleDefinition.name,
      },
    }));

  for (const permissionCode of roleDefinition.permissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permissionCode } });

    if (!permission) {
      throw new Error(`Missing permission ${permissionCode}`);
    }

    await prisma.rolePermission.upsert({
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

  return role.id;
}

async function main(): Promise<void> {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are required');
  }

  if (password.length < 8) {
    throw new Error('PLATFORM_ADMIN_PASSWORD must be at least 8 characters');
  }

  await ensurePermissions();
  const platformRoleId = await ensurePlatformRole();

  const platformOrganization =
    (await prisma.organization.findUnique({
      where: { code: PLATFORM_ORGANIZATION_CODE },
    })) ??
    (await prisma.organization.create({
      data: {
        name: 'CampusOps Platform',
        code: PLATFORM_ORGANIZATION_CODE,
      },
    }));

  const existingSettings = await prisma.organizationSettings.findUnique({
    where: { organizationId: platformOrganization.id },
  });

  if (!existingSettings) {
    await prisma.organizationSettings.create({
      data: { organizationId: platformOrganization.id },
    });
  }

  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const platformAdmin = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: platformOrganization.id,
        email: normalizedEmail,
      },
    },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      organizationId: platformOrganization.id,
      email: normalizedEmail,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: platformAdmin.id,
        roleId: platformRoleId,
      },
    },
    update: {},
    create: {
      userId: platformAdmin.id,
      roleId: platformRoleId,
    },
  });

  console.log('Platform administrator bootstrap completed.');
  console.log(`Organization code: ${PLATFORM_ORGANIZATION_CODE}`);
  console.log(`Admin email: ${normalizedEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      'Platform administrator bootstrap failed.',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
