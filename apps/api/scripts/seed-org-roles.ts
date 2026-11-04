import { PrismaClient } from '@prisma/client';
import { PLATFORM_ORGANIZATION_CODE } from '../src/organizations/constants/organization.constants';
import { ORGANIZATION_ROLE_DEFINITIONS } from '../src/permissions/constants/system-roles';
import { ensureDefaultLeaveApprovalWorkflow } from '../src/approvals/utils/approval-workflow-seed.util';
import { ensureOrganizationRole } from '../src/roles/organization-role-seed.util';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const organizations = await prisma.organization.findMany({
    where: { code: { not: PLATFORM_ORGANIZATION_CODE } },
    select: { id: true, name: true },
  });

  console.log(`Seeding roles for ${organizations.length} organizations...`);

  for (const org of organizations) {
    console.log(`  → ${org.name} (${org.id})`);
    for (const roleDef of ORGANIZATION_ROLE_DEFINITIONS) {
      await ensureOrganizationRole(prisma, org.id, roleDef);
    }
    await ensureDefaultLeaveApprovalWorkflow(prisma, org.id);
  }

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
