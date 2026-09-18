import { ApprovalApproverType, ApprovalEntityType, Prisma } from '@prisma/client';
import { ORGANIZATION_ROLE_CODES } from '../../permissions/constants/system-roles';
import { DEFAULT_LEAVE_APPROVAL_WORKFLOW_CODE } from '../constants/approval.constants';

type PrismaClientLike = Prisma.TransactionClient | {
  role: Prisma.TransactionClient['role'];
  approvalWorkflow: Prisma.TransactionClient['approvalWorkflow'];
  approvalLevel: Prisma.TransactionClient['approvalLevel'];
};

export async function ensureDefaultLeaveApprovalWorkflow(
  client: PrismaClientLike,
  organizationId: string,
): Promise<void> {
  const schoolAdminRole = await client.role.findFirst({
    where: {
      organizationId,
      code: ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
    },
  });

  if (!schoolAdminRole) {
    throw new Error('School admin role not found for approval workflow seed');
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
      name: 'School Admin Approval',
      approverType: ApprovalApproverType.ROLE,
      roleId: schoolAdminRole.id,
      userId: null,
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
