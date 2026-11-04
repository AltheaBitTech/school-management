import { ApprovalApproverType, ApprovalEntityType, Prisma } from '@prisma/client';
import { ORGANIZATION_ROLE_CODES } from '../../permissions/constants/system-roles';
import {
  BUDGET_APPROVAL_WORKFLOW_CODE,
  DEFAULT_LEAVE_APPROVAL_WORKFLOW_CODE,
  MAINTENANCE_APPROVAL_WORKFLOW_CODE,
  PURCHASE_APPROVAL_WORKFLOW_CODE,
} from '../constants/approval.constants';

type PrismaClientLike = Prisma.TransactionClient | {
  role: Prisma.TransactionClient['role'];
  approvalWorkflow: Prisma.TransactionClient['approvalWorkflow'];
  approvalLevel: Prisma.TransactionClient['approvalLevel'];
};

export async function ensureDefaultLeaveApprovalWorkflow(
  client: PrismaClientLike,
  organizationId: string,
): Promise<void> {
  const principalRole = await client.role.findFirst({
    where: {
      organizationId,
      code: ORGANIZATION_ROLE_CODES.PRINCIPAL,
    },
  });

  if (!principalRole) {
    throw new Error('Principal role not found for leave approval workflow seed');
  }

  const workflow = await client.approvalWorkflow.upsert({
    where: {
      organizationId_code: {
        organizationId,
        code: DEFAULT_LEAVE_APPROVAL_WORKFLOW_CODE,
      },
    },
    update: {
      name: 'Leave Approval',
      description: 'Default leave approval workflow',
      entityType: ApprovalEntityType.LEAVE,
      isActive: true,
    },
    create: {
      organizationId,
      code: DEFAULT_LEAVE_APPROVAL_WORKFLOW_CODE,
      name: 'Leave Approval',
      description: 'Default leave approval workflow',
      entityType: ApprovalEntityType.LEAVE,
      isActive: true,
    },
  });

  await client.approvalLevel.upsert({
    where: {
      workflowId_level: {
        workflowId: workflow.id,
        level: 1,
      },
    },
    update: {
      name: 'Principal Approval',
      approverType: ApprovalApproverType.ROLE,
      roleId: principalRole.id,
      userId: null,
    },
    create: {
      workflowId: workflow.id,
      level: 1,
      name: 'Principal Approval',
      approverType: ApprovalApproverType.ROLE,
      roleId: principalRole.id,
    },
  });
}

const OPERATIONAL_WORKFLOWS: Array<{ code: string; name: string; entityType: ApprovalEntityType }> = [
  {
    code: MAINTENANCE_APPROVAL_WORKFLOW_CODE,
    name: 'Maintenance Approval',
    entityType: ApprovalEntityType.MAINTENANCE,
  },
  {
    code: PURCHASE_APPROVAL_WORKFLOW_CODE,
    name: 'Purchase Approval',
    entityType: ApprovalEntityType.PURCHASE,
  },
  {
    code: BUDGET_APPROVAL_WORKFLOW_CODE,
    name: 'Budget Approval',
    entityType: ApprovalEntityType.BUDGET,
  },
];

export async function ensureDefaultOperationalApprovalWorkflows(
  client: PrismaClientLike,
  organizationId: string,
): Promise<void> {
  const schoolAdminRole = await client.role.findFirst({
    where: { organizationId, code: ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN },
  });
  if (!schoolAdminRole) {
    return;
  }

  for (const definition of OPERATIONAL_WORKFLOWS) {
    const workflow = await client.approvalWorkflow.upsert({
      where: { organizationId_code: { organizationId, code: definition.code } },
      update: {
        name: definition.name,
        entityType: definition.entityType,
        isActive: true,
      },
      create: {
        organizationId,
        code: definition.code,
        name: definition.name,
        entityType: definition.entityType,
        isActive: true,
      },
    });

    await client.approvalLevel.upsert({
      where: { workflowId_level: { workflowId: workflow.id, level: 1 } },
      update: {
        name: 'School Admin Approval',
        approverType: ApprovalApproverType.ROLE,
        roleId: schoolAdminRole.id,
      },
      create: {
        workflowId: workflow.id,
        level: 1,
        name: 'School Admin Approval',
        approverType: ApprovalApproverType.ROLE,
        roleId: schoolAdminRole.id,
      },
    });
  }
}
