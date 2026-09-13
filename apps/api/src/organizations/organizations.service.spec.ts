import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrganizationStatus, Prisma, UserStatus } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { PasswordService } from '../auth/services/password.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizationsService', () => {
  let organizationsService: OrganizationsService;
  let prisma: {
    $transaction: jest.Mock;
    organization: { findUnique: jest.Mock };
  };
  let passwordService: jest.Mocked<Pick<PasswordService, 'hash'>>;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      organization: { findUnique: jest.fn() },
    };
    passwordService = {
      hash: jest.fn().mockResolvedValue('$argon2id$hash'),
    };

    organizationsService = new OrganizationsService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
    );
  });

  it('rejects invalid organization codes before starting a transaction', async () => {
    await expect(
      organizationsService.bootstrapOrganization({
        name: 'Test School',
        code: 'ab',
        admin: {
          email: 'admin@school.example',
          password: 'StrongPassword123!',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('bootstraps an organization transactionally', async () => {
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        organization: {
          create: jest.fn().mockResolvedValue({
            id: 'org-1',
            name: 'Test School',
            code: 'test-school',
            status: OrganizationStatus.ACTIVE,
          }),
        },
        organizationSettings: {
          create: jest.fn().mockResolvedValue({ id: 'settings-1' }),
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'admin@school.example',
            organizationId: 'org-1',
            passwordHash: '$argon2id$hash',
            status: UserStatus.ACTIVE,
          }),
        },
        userRole: {
          create: jest.fn().mockResolvedValue({ id: 'user-role-1' }),
        },
        role: {
          upsert: jest.fn().mockResolvedValue({ id: 'role-1', code: 'SCHOOL_ADMIN' }),
        },
        permission: {
          findUnique: jest.fn().mockResolvedValue({ id: 'perm-1' }),
        },
        rolePermission: {
          upsert: jest.fn().mockResolvedValue({ id: 'role-perm-1' }),
        },
      }),
    );

    const result = await organizationsService.bootstrapOrganization({
      name: 'Test School',
      code: 'Test-School',
      admin: {
        email: 'Admin@School.Example',
        password: 'StrongPassword123!',
      },
    });

    expect(result.organization.code).toBe('test-school');
    expect(result.admin.email).toBe('admin@school.example');
    expect(passwordService.hash).toHaveBeenCalledWith('StrongPassword123!');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('maps duplicate organization code errors to conflict responses', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['code'] },
      }),
    );

    await expect(
      organizationsService.bootstrapOrganization({
        name: 'Test School',
        code: 'test-school',
        admin: {
          email: 'admin@school.example',
          password: 'StrongPassword123!',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
