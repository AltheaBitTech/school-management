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

const PHASE_7_BUSINESS_MODELS = ['Notice', 'NoticeAudience', 'NoticeRead'] as const;

const PHASE_8_BUSINESS_MODELS = ['Visitor', 'VisitorHistory'] as const;

const PHASE_9_BUSINESS_MODELS = [
  'AssetCategory',
  'Asset',
  'AssetMaintenance',
  'AssetTransfer',
  'AssetHistory',
] as const;

const PHASE_10A_BUSINESS_MODELS = ['File'] as const;

const PHASE_10B_BUSINESS_MODELS = ['Student', 'DocumentTemplate', 'GeneratedDocument'] as const;

const PHASE_11_BUSINESS_MODELS = [
  'ApprovalWorkflow',
  'ApprovalLevel',
  'ApprovalRequest',
  'ApprovalAction',
] as const;

const PHASE_12_BUSINESS_MODELS = ['Venue', 'Event', 'EventParticipant'] as const;

const AUDIT_FOUNDATION_MODELS = ['AuditLog'] as const;

const FORBIDDEN_BUSINESS_MODELS = [
  'Visit',
  'FeeStructure',
  'TransportRoute',
  'Notification',
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

  it('exposes the Phase 7 notice models', () => {
    for (const modelName of PHASE_7_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 8 visitor models', () => {
    for (const modelName of PHASE_8_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 9 asset models', () => {
    for (const modelName of PHASE_9_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 10A file model', () => {
    for (const modelName of PHASE_10A_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 10B student and document models', () => {
    for (const modelName of PHASE_10B_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 11 approval models', () => {
    for (const modelName of PHASE_11_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the Phase 12 event models', () => {
    for (const modelName of PHASE_12_BUSINESS_MODELS) {
      expect(Prisma.ModelName).toHaveProperty(modelName);
    }
  });

  it('exposes the audit foundation model', () => {
    for (const modelName of AUDIT_FOUNDATION_MODELS) {
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
