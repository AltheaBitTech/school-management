import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/constants/audit.constants';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_MANAGEMENT_ERROR_CODES, RoleManagementService } from './role-management.service';

type Mock = jest.Mock;

describe('RoleManagementService', () => {
  let service: RoleManagementService;
  let prisma: {
    role: { findFirst: Mock; findUnique: Mock; findMany: Mock; create: Mock; update: Mock; delete: Mock };
    permission: { findMany: Mock };
    rolePermission: { findMany: Mock; deleteMany: Mock; createMany: Mock };
    userRole: { count: Mock };
    approvalLevel: { count: Mock };
    $transaction: Mock;
  };
  let permissionsService: { getEffectivePermissions: Mock };
  let auditService: { record: Mock };

  const actor = {
    userId: 'actor-1',
    organizationId: 'org-a',
    sessionId: 'session-1',
    email: 'actor@example.com',
    activeRoleId: 'actor-role',
  };

  const roleRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'role-1',
    organizationId: 'org-a',
    code: 'CUSTOM_LIBRARIAN',
    name: 'Librarian',
    description: null,
    isSystem: false,
    permissionsCustomizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { rolePermissions: 1, userRoles: 0 },
    ...overrides,
  });

  /** findFirst is used for: role lookup by id, actor active role, name uniqueness. */
  function mockFindFirst(options: {
    target?: ReturnType<typeof roleRow> | null;
    actorRoleCode?: string;
    nameTaken?: boolean;
  }) {
    prisma.role.findFirst.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if (args.where.name) {
        return options.nameTaken ? { id: 'other' } : null;
      }
      if (args.where.id === actor.activeRoleId) {
        return options.actorRoleCode ? { code: options.actorRoleCode } : null;
      }
      return options.target === undefined ? roleRow() : options.target;
    });
  }

  beforeEach(() => {
    prisma = {
      role: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        create: jest.fn().mockResolvedValue(roleRow()),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permission: {
        findMany: jest.fn(async (args: { where: { code: { in: string[] } } }) =>
          args.where.code.in.map((code) => ({ id: `p-${code}`, code })),
        ),
      },
      rolePermission: {
        findMany: jest.fn().mockResolvedValue([{ permission: { code: 'notice.view' } }]),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      userRole: { count: jest.fn().mockResolvedValue(0) },
      approvalLevel: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );
    permissionsService = { getEffectivePermissions: jest.fn().mockResolvedValue([]) };
    auditService = { record: jest.fn() };

    service = new RoleManagementService(
      prisma as unknown as PrismaService,
      permissionsService as unknown as PermissionsService,
      auditService as unknown as AuditService,
    );
  });

  describe('createRole', () => {
    it('creates a custom role with a generated code and audits it', async () => {
      mockFindFirst({ actorRoleCode: 'SCHOOL_ADMIN' });

      await service.createRole(actor, { name: 'Librarian', permissions: ['notice.view'] });

      expect(prisma.role.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-a',
          code: 'CUSTOM_LIBRARIAN',
          name: 'Librarian',
          isSystem: false,
        }),
      });
      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 'role-1', permissionId: 'p-notice.view' }],
        skipDuplicates: true,
      });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTIONS.ROLE_CREATED }),
        prisma,
      );
    });

    it('suffixes the code when the slug is already used', async () => {
      mockFindFirst({ actorRoleCode: 'SCHOOL_ADMIN' });
      prisma.role.findUnique.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null);

      await service.createRole(actor, { name: 'Librarian', permissions: [] });

      expect(prisma.role.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'CUSTOM_LIBRARIAN_2' }),
      });
    });

    it('rejects platform permissions', async () => {
      mockFindFirst({ actorRoleCode: 'SCHOOL_ADMIN' });

      await expect(
        service.createRole(actor, { name: 'Sneaky', permissions: ['platform.organization.create'] }),
      ).rejects.toMatchObject({
        response: { code: ROLE_MANAGEMENT_ERROR_CODES.INVALID_PERMISSION },
      });
      expect(prisma.role.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate name', async () => {
      mockFindFirst({ actorRoleCode: 'SCHOOL_ADMIN', nameTaken: true });

      await expect(
        service.createRole(actor, { name: 'Teacher', permissions: [] }),
      ).rejects.toMatchObject({ response: { code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_NAME_TAKEN } });
    });

    it('lets School Admin grant permissions it does not hold itself', async () => {
      mockFindFirst({ actorRoleCode: 'SCHOOL_ADMIN' });

      await expect(
        service.createRole(actor, { name: 'Vice Principal', permissions: ['leave.approve'] }),
      ).resolves.toBeDefined();
      expect(permissionsService.getEffectivePermissions).not.toHaveBeenCalled();
    });

    it('blocks other roles from granting permissions they lack', async () => {
      mockFindFirst({ actorRoleCode: 'PRINCIPAL' });
      permissionsService.getEffectivePermissions.mockResolvedValue(['role.create', 'notice.view']);

      await expect(
        service.createRole(actor, { name: 'Cashier', permissions: ['notice.view', 'fee.view'] }),
      ).rejects.toMatchObject({
        response: { code: ROLE_MANAGEMENT_ERROR_CODES.PERMISSION_ESCALATION },
      });
    });
  });

  describe('updateRole', () => {
    it('returns 404 for a role in another organization', async () => {
      mockFindFirst({ target: null, actorRoleCode: 'SCHOOL_ADMIN' });

      await expect(
        service.updateRole(actor, 'role-b', { permissions: [] }),
      ).rejects.toMatchObject({ response: { code: RBAC_ERROR_CODES.ROLE_NOT_FOUND } });
    });

    it('locks School Admin permissions', async () => {
      mockFindFirst({
        target: roleRow({ code: 'SCHOOL_ADMIN', name: 'School Admin', isSystem: true }),
        actorRoleCode: 'SCHOOL_ADMIN',
      });

      await expect(
        service.updateRole(actor, 'role-1', { permissions: ['notice.view'] }),
      ).rejects.toMatchObject({ response: { code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_LOCKED } });
    });

    it('marks a system role as customized when its permissions change', async () => {
      mockFindFirst({
        target: roleRow({ code: 'TEACHER', name: 'Teacher', isSystem: true }),
        actorRoleCode: 'SCHOOL_ADMIN',
      });

      await service.updateRole(actor, 'role-1', { permissions: ['notice.view', 'fee.view'] });

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'role-1' },
        data: expect.objectContaining({ permissionsCustomizedAt: expect.any(Date) }),
      });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.ROLE_UPDATED,
          metadata: expect.objectContaining({
            addedPermissions: ['fee.view'],
            removedPermissions: [],
          }),
        }),
        prisma,
      );
    });

    it('does not allow renaming a system role', async () => {
      mockFindFirst({
        target: roleRow({ code: 'TEACHER', name: 'Teacher', isSystem: true }),
        actorRoleCode: 'SCHOOL_ADMIN',
      });

      await expect(
        service.updateRole(actor, 'role-1', { name: 'Faculty' }),
      ).rejects.toMatchObject({
        response: { code: ROLE_MANAGEMENT_ERROR_CODES.SYSTEM_ROLE_IMMUTABLE },
      });
    });
  });

  describe('deleteRole', () => {
    it('refuses to delete a system role', async () => {
      mockFindFirst({ target: roleRow({ isSystem: true }) });

      await expect(service.deleteRole(actor, 'role-1')).rejects.toMatchObject({
        response: { code: ROLE_MANAGEMENT_ERROR_CODES.SYSTEM_ROLE_IMMUTABLE },
      });
    });

    it('refuses to delete a role assigned to users', async () => {
      mockFindFirst({});
      prisma.userRole.count.mockResolvedValue(2);

      await expect(service.deleteRole(actor, 'role-1')).rejects.toMatchObject({
        response: { code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_IN_USE },
      });
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('deletes an unused custom role and audits it', async () => {
      mockFindFirst({});

      await service.deleteRole(actor, 'role-1');

      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTIONS.ROLE_DELETED }),
        prisma,
      );
    });
  });
});
