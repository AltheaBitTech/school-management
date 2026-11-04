# Phase 2 — Role System: Department-Based Roles + Student Role + Permission-Filtered Nav
# Run this with Composer 2.5

## Goal
Add 6 new fixed role templates (Principal, Teacher, Receptionist, Maintenance Staff, Accountant, Student),
seed them for all existing organizations, and ensure the frontend nav already filters by permissions (done in Phase 1).

## Context
- Role definitions: `apps/api/src/permissions/constants/system-roles.ts`
- Permission catalog: `apps/api/src/permissions/constants/system-permissions.ts`
- Role seed utility: `apps/api/src/roles/organization-role-seed.util.ts`
- Onboarding service (where roles are seeded for new orgs): `apps/api/src/onboarding/onboarding.service.ts`
- Existing org roles: SCHOOL_ADMIN (full access), STAFF (self-service only)
- New roles to add: PRINCIPAL, TEACHER, RECEPTIONIST, MAINTENANCE_STAFF, ACCOUNTANT, STUDENT

## Task 1 — Add New Permission Codes

In `apps/api/src/permissions/constants/system-permissions.ts`, add these new permission entries to `SYSTEM_PERMISSIONS`:

```
{ code: 'student.self.view', description: 'View own student profile' }
{ code: 'student.self.fee.view', description: 'View own fee dues and payment history' }
{ code: 'student.self.fee.receipt.download', description: 'Download own fee payment receipts' }
{ code: 'student.self.certificate.download', description: 'Download own academic certificates (bonafide, character)' }
```

## Task 2 — Add New Role Definitions

In `apps/api/src/permissions/constants/system-roles.ts`:

Add to `ORGANIZATION_ROLE_CODES`:
```typescript
PRINCIPAL: 'PRINCIPAL',
TEACHER: 'TEACHER',
RECEPTIONIST: 'RECEPTIONIST',
MAINTENANCE_STAFF: 'MAINTENANCE_STAFF',
ACCOUNTANT: 'ACCOUNTANT',
STUDENT: 'STUDENT',
```

Add to `ORGANIZATION_ROLE_DEFINITIONS` array:

### PRINCIPAL
```typescript
{
  code: 'PRINCIPAL',
  name: 'Principal',
  permissions: [
    'dashboard.view',
    'staff.view',
    'department.view',
    'student.view',
    'leave.view',
    'leave.approve',
    'leave.reject',
    'attendance.view',
    'complaint.view',
    'complaint.assign',
    'complaint.update',
    'complaint.close',
    'notice.view',
    'notice.create',
    'notice.update',
    'notice.publish',
    'notice.archive',
    'event.view',
    'approval.view',
    'approval.approve',
    'approval.reject',
    'report.attendance.view',
    'report.leave.view',
    'report.complaints.view',
    'report.visitors.view',
    'report.event.view',
  ],
}
```

### TEACHER
```typescript
{
  code: 'TEACHER',
  name: 'Teacher',
  permissions: [
    'staff.self.view',
    'staff.self.attendance.view',
    'staff.self.leave.view',
    'staff.self.leave.create',
    'notice.view',
    'event.view',
    'complaint.view',
    'complaint.create',
  ],
}
```

### RECEPTIONIST
```typescript
{
  code: 'RECEPTIONIST',
  name: 'Receptionist',
  permissions: [
    'visitor.view',
    'visitor.create',
    'visitor.checkout',
    'notice.view',
    'event.view',
    'document.view',
    'document.generate',
    'document.download',
  ],
}
```

### MAINTENANCE_STAFF
```typescript
{
  code: 'MAINTENANCE_STAFF',
  name: 'Maintenance Staff',
  permissions: [
    'complaint.view',
    'complaint.update',
    'notice.view',
  ],
}
```

### ACCOUNTANT
```typescript
{
  code: 'ACCOUNTANT',
  name: 'Accountant',
  permissions: [
    'fee.view',
    'fee.create',
    'fee.assign',
    'fee.record_payment',
    'asset.view',
    'asset.create',
    'asset.update',
    'asset.assign',
    'asset.transfer',
    'document.view',
    'document.generate',
    'document.download',
    'approval.view',
    'approval.submit',
    'report.fees.view',
    'report.visitors.view',
  ],
}
```

### STUDENT
```typescript
{
  code: 'STUDENT',
  name: 'Student',
  permissions: [
    'student.self.view',
    'student.self.fee.view',
    'student.self.fee.receipt.download',
    'student.self.certificate.download',
    'notice.view',
    'event.view',
  ],
}
```

## Task 3 — Prisma Migration for New Permissions

The `Permission` table is seeded from `SYSTEM_PERMISSIONS` in the bootstrap/seed script.
Check `apps/api/prisma/seed.ts` or the bootstrap script and ensure new permission codes are seeded.

If permissions are seeded via a separate script, add the new 4 permission codes to that script.

## Task 4 — Seed New Roles for ALL Existing Organizations

Create `apps/api/scripts/seed-org-roles.ts`:

```typescript
// One-time script to seed all new role definitions for every existing organization
// Run with: pnpm --filter @campusops/api tsx scripts/seed-org-roles.ts

import { PrismaClient } from '@prisma/client';
import { ORGANIZATION_ROLE_DEFINITIONS } from '../src/permissions/constants/system-roles';
import { ensureOrganizationRole } from '../src/roles/organization-role-seed.util';
import { PLATFORM_ORGANIZATION_CODE } from '../src/organizations/constants/organization.constants';

async function main() {
  const prisma = new PrismaClient();
  const organizations = await prisma.organization.findMany({
    where: { code: { not: PLATFORM_ORGANIZATION_CODE } },
    select: { id: true, name: true },
  });

  console.log(`Seeding roles for ${organizations.length} organizations...`);

  for (const org of organizations) {
    console.log(`  → ${org.name} (${org.id})`);
    for (const roleDef of ORGANIZATION_ROLE_DEFINITIONS) {
      await ensureOrganizationRole(prisma as any, org.id, roleDef);
    }
  }

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch(console.error);
```

Add to `apps/api/package.json` scripts:
```json
"seed:org-roles": "tsx scripts/seed-org-roles.ts"
```

## Task 5 — Seed Roles During New School Onboarding

In the onboarding service or organization creation service, after creating a new organization,
call `ensureOrganizationRole` for ALL `ORGANIZATION_ROLE_DEFINITIONS` entries (not just SCHOOL_ADMIN and STAFF).

Check `apps/api/src/organization-registrations/organization-registrations.service.ts` —
find where a new organization is provisioned and ensure all 8 roles are seeded there.

## Task 6 — Frontend: Role Label in User Profile Display

Also fix the /me backend endpoint: In apps/api/src/auth/dto/me-response.dto.ts, add staff (firstName, lastName, displayName) and role (name, code) optional fields to MeUserDto. In the auth service getMe() method, join on the linked StaffProfile and the user's primary role and return them. This enables the topbar to show real name and role label.

In the AppShell topbar user info section:
- Fetch the user's primary role name from the session
- Display it as a small chip or subtitle under the user's name
- Example: "Mira Sharma · Principal"

The auth session already returns `user.permissions[]`. 
The role name may need to be added to the session response — check `apps/api/src/auth/` 
and add `roleName` or `roles[]` to the session/me response if not already present.

## Task 7 — Staff Creation: Role Assignment UI

In `apps/web/src/app/(app)/staff/new/page.tsx` (and edit page):
- Add a "Role" select field listing all available org roles (fetched from `GET /roles`)
- When a staff member is created and has a linked user account, assign the selected role
- Add role display on the staff detail page

## Acceptance Criteria
- [ ] 6 new roles exist in `system-roles.ts`
- [ ] 4 new student.self.* permissions exist in `system-permissions.ts`
- [ ] `seed-org-roles.ts` script exists and runs without errors
- [ ] New organizations provisioned during onboarding get all 8 roles
- [ ] Staff creation form has role assignment
- [ ] `pnpm --filter @campusops/api typecheck` passes
- [ ] Run `pnpm --filter @campusops/api seed:org-roles` against dev DB — no errors
