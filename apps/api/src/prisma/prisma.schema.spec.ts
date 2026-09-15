import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';

const IDENTITY_RBAC_MODELS = [
  'Organization',
  'OrganizationSettings',
  'User',
  'Role',
  'Permission',
  'RolePermission',
  'UserRole',
] as const;

const PHASE_3_BUSINESS_MODELS = ['Department', 'Staff'] as const;

const PHASE_4_BUSINESS_MODELS = ['StaffAttendance'] as const;

const PHASE_5_BUSINESS_MODELS = ['LeaveType', 'LeaveBalance', 'LeaveRequest'] as const;

const PHASE_6_BUSINESS_MODELS = ['Complaint', 'ComplaintHistory'] as const;

const FORBIDDEN_BUSINESS_MODELS = [
  'Student',
  'Visitor',
  'Visit',
  'Notice',
  'Asset',
  'DocumentTemplate',
  'GeneratedDocument',
  'ApprovalWorkflow',
  'ApprovalRequest',
  'Event',
  'FeeStructure',
  'TransportRoute',
  'Notification',
  'AuditLog',
  'ActivityLog',
  'ParentGuardian',
  'StudentGuardian',
];

describe('Prisma identity and RBAC schema', () => {
  it('exposes the Phase 1A identity and RBAC models', () => {
    for (const modelName of IDENTITY_RBAC_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 3 department and staff models', () => {
    for (const modelName of PHASE_3_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 4 staff attendance model', () => {
    for (const modelName of PHASE_4_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 5 leave models', () => {
    for (const modelName of PHASE_5_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 6 complaint models', () => {
    for (const modelName of PHASE_6_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('does not expose future business domain models in this phase', () => {
    const modelNames = Object.values(Prisma.ModelName);

    for (const modelName of FORBIDDEN_BUSINESS_MODELS) {
      expect(modelNames).not.toContain(modelName);
    }
  });

  it('defines tenant-aware user email uniqueness via composite key fields', () => {
    expect(Prisma.UserScalarFieldEnum).toHaveProperty('organizationId');
    expect(Prisma.UserScalarFieldEnum).toHaveProperty('email');
  });

  it('defines duplicate-prevention join models for RBAC assignments', () => {
    expect(Prisma.RolePermissionScalarFieldEnum).toHaveProperty('roleId');
    expect(Prisma.RolePermissionScalarFieldEnum).toHaveProperty('permissionId');
    expect(Prisma.UserRoleScalarFieldEnum).toHaveProperty('userId');
    expect(Prisma.UserRoleScalarFieldEnum).toHaveProperty('roleId');
  });

  it('stores permissions using the resource.action code field', () => {
    expect(Prisma.PermissionScalarFieldEnum).toHaveProperty('code');
  });

  it('stores refresh sessions for authentication token rotation', () => {
    expect(Prisma.ModelName).toHaveProperty('RefreshSession');
  });

  it('documents the manual platform-role partial unique index workflow', () => {
    const migrationNotesPath = join(__dirname, '../../prisma/MIGRATION-NOTES.md');
    const migrationSqlPath = join(
      __dirname,
      '../../prisma/migrations/20250911010000_identity_rbac_foundation/migration.sql',
    );

    expect(existsSync(migrationNotesPath)).toBe(true);
    const migrationSql = readFileSync(migrationSqlPath, 'utf8');
    expect(migrationSql).toContain('Role_platform_code_key');
    expect(migrationSql).toContain('WHERE "organizationId" IS NULL');
  });
});
