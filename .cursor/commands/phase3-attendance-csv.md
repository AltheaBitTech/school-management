# Phase 3 — Attendance Nav Removal + Invite-Based Login + Bulk Staff CSV Import
# Run this with Composer 2.5

---

## Context & Design Decisions

1. **Email is required at staff creation** — every staff record must have an email.
2. **Login provisioning uses invite link, NOT admin-set password** — admin never sees or sets the staff member's password.
3. **Invite flow reuses `PasswordResetToken` infrastructure** — same model, same `/reset-password` page, same token TTL.
4. **No SMTP required for demo** — invite URL is printed to server console AND returned in the API response so the frontend can display a copyable link.
5. **CSV import auto-provisions login** — every successfully imported staff row with an email gets an invite link returned in the import result.
6. **Attendance nav already removed** in Phase 1 — Part A below is a verification only.

---

## Part A — Verify Attendance Removed from Admin Sidebar

Phase 1 already removed `Attendance` from `NAV_GROUPS` in `AppShell.tsx`.

**Verify only:**
- Confirm `{ href: '/attendance' ... }` is NOT in `NAV_GROUPS` in `apps/web/src/components/layout/AppShell.tsx`
- Confirm `/reports/attendance` route still exists and loads
- Confirm `/staff/attendance` (staff self-service) still exists

If attendance is still in `NAV_GROUPS`, remove it. Do NOT delete the page or API.

---

## Part B — Invite-Based Staff Login Provisioning (Replace Password Flow)

### Goal
Replace the current "admin sets password" flow with an invite-link flow:
- Admin provisions login for a staff member (or it happens automatically on CSV import)
- System creates user account with `passwordHash: null`
- System generates a `PasswordResetToken` (reusing existing model)
- System prints invite details to console and returns invite URL in API response
- Frontend shows copyable invite link dialog
- Staff opens link → sets their own password → logs in

### Backend Changes

#### Step 1 — Make email required on Staff model

Check `apps/api/src/staff/dto/create-staff.dto.ts`.
If `email` is currently optional (`@IsOptional()`), change it to required:
```typescript
@IsEmail()
@IsNotEmpty()
email!: string;
```

Also update `apps/api/src/staff/dto/update-staff.dto.ts` — email can remain optional on update (allow changing email, but initial creation requires it).

#### Step 2 — Update `ProvisionStaffLoginDto`

File: `apps/api/src/staff/dto/provision-staff-login.dto.ts`

Remove the `password` field entirely. The new DTO:
```typescript
export class ProvisionStaffLoginDto {
  @ApiProperty({ description: 'Email for login. Must match staff email or be the staff email.' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Role to assign to this user' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;
}
```

#### Step 3 — Rewrite `StaffLoginProvisioningService.provisionLogin()`

File: `apps/api/src/staff/staff-login-provisioning.service.ts`

**New dependencies to inject:**
- `PasswordResetService` (from `apps/api/src/auth/services/password-reset.service.ts`)

OR instead of injecting the full service, implement the token generation inline using the same utilities:
- `generateRefreshToken()` from `apps/api/src/auth/utils/token-hash.util.ts`
- `hashRefreshToken()` from the same file
- `buildPasswordResetUrl()` from `apps/api/src/auth/utils/password-reset-email.util.ts`
- Use `PasswordResetToken` Prisma model directly

**New `provisionLogin` logic:**

```typescript
async provisionLogin(actor, staffId, dto, options?): Promise<ProvisionStaffLoginResult> {
  // 1. Resolve staff — same as before
  // 2. Validate staff not already provisioned — same as before
  // 3. Validate staff not offboarded — same as before
  // 4. Resolve role — same as before
  // 5. Check duplicate email — same as before

  // 6. Create user WITHOUT password
  const user = await tx.user.create({
    data: {
      organizationId,
      email: normalizedEmail,
      passwordHash: null,   // ← no password — set via invite link
      status: UserStatus.ACTIVE,
    },
  });

  // 7. Assign role — same as before

  // 8. Link staff to user — same as before

  // 9. Generate invite token (reuse PasswordResetToken model)
  const rawToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS); // 24h

  await tx.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // 10. Build invite URL
  const inviteUrl = buildPasswordResetUrl(config, rawToken, dto.organizationCode ?? organization.code);
  // Use the existing buildPasswordResetUrl util — it builds:
  // {frontendOrigin}/reset-password?token={rawToken}&orgCode={orgCode}
  // Add &isInvite=true to the URL:
  const inviteUrlWithFlag = `${inviteUrl}&isInvite=true`;

  // 11. Print to console
  const borderLine = '═'.repeat(60);
  console.log(`\n${borderLine}`);
  console.log(`  CampusOps — Staff Login Invite`);
  console.log(`  Name:    ${staff.firstName} ${staff.lastName}`);
  console.log(`  Email:   ${normalizedEmail}`);
  console.log(`  Role:    ${role.name}`);
  console.log(`  Link:    ${inviteUrlWithFlag}`);
  console.log(`  Expires: 24 hours from now`);
  console.log(`${borderLine}\n`);

  // 12. Return result with inviteUrl
  return {
    staff: updatedStaff,
    loginEmail: normalizedEmail,
    inviteUrl: inviteUrlWithFlag,
    inviteExpiresAt: expiresAt.toISOString(),
  };
}
```

**Update `ProvisionStaffLoginResult` interface:**
```typescript
export interface ProvisionStaffLoginResult {
  staff: StaffWithDepartment;
  loginEmail: string;
  inviteUrl: string;
  inviteExpiresAt: string;
}
```

**Note on `buildPasswordResetUrl`:** Check `apps/api/src/auth/utils/password-reset-email.util.ts` for the exact signature. If it takes `(config, rawToken)` and builds the URL from `primaryFrontendOrigin(config)`, call it that way and append `&isInvite=true` manually.

**Note on organization code:** To build the URL, you need the org code. Fetch it from the organization record when resolving the staff:
```typescript
const staff = await prisma.staff.findFirst({
  where: { id: staffId, organizationId },
  include: {
    department: { select: { id: true, name: true, code: true } },
    organization: { select: { code: true } },  // add this
  },
});
```

#### Step 4 — Update Staff Controller Response DTO

File: `apps/api/src/staff/dto/` — update the provision login response DTO to include invite fields:

```typescript
export class ProvisionStaffLoginResponseDto {
  // existing fields...
  @ApiProperty()
  inviteUrl!: string;

  @ApiProperty()
  inviteExpiresAt!: string;
}
```

#### Step 5 — Handle `passwordHash: null` at Login

File: `apps/api/src/auth/auth.service.ts` — in the `login()` method:

The existing code already does:
```typescript
if (!user || !user.passwordHash) {
  throw this.invalidCredentials();
}
```

This correctly blocks login until the staff member sets their password via the invite link. **No change needed.**

---

### Frontend Changes

#### Step 6 — Staff Detail Page: Show Invite Link Dialog

File: `apps/web/src/app/(app)/staff/[id]/page.tsx`

After calling the provision login API, the response now includes `inviteUrl` and `inviteExpiresAt`.
Show an MUI Dialog:

```
┌─────────────────────────────────────────────────────┐
│  ✅  Login created for Mira Sharma                   │
│                                                     │
│  Share this invite link — it expires in 24 hours:  │
│                                                     │
│  [https://campusops.../reset-password?token=...]    │
│  [  Copy link  ]                                    │
│                                                     │
│  The staff member will be prompted to set their     │
│  own password when they open the link.              │
│                                                     │
│                              [ Done ]               │
└─────────────────────────────────────────────────────┘
```

Implementation:
- State: `inviteDialogData: { name: string; inviteUrl: string; inviteExpiresAt: string } | null`
- On provision success: `setInviteDialogData({ name, inviteUrl, inviteExpiresAt })`
- Dialog has a "Copy link" button using `navigator.clipboard.writeText(inviteUrl)`
- After copy: button label changes to "Copied!" for 2 seconds
- "Done" button closes the dialog

#### Step 7 — Remove Password Field from Staff Provision Form

File: `apps/web/src/app/(app)/staff/[id]/page.tsx` (the "Create Login" section/dialog)

Remove the password input field. The form now only needs:
- Email field (pre-filled from staff email if available)
- Role select (pre-filled from `provisionRoleId` query param or current role)
- "Send Invite" button (was "Create Login")

#### Step 8 — `/reset-password` Page: Detect Invite Mode

File: `apps/web/src/app/(auth)/reset-password/page.tsx`

Read `isInvite=true` from search params. When `isInvite=true`:
- Page title: "Welcome to CampusOps!" instead of "Reset password"
- Description: "Set your password to activate your account and get started." instead of "Enter a new password."
- Submit button: "Set password & sign in" instead of "Reset password"
- After success: redirect to `/login` with a success message "Password set! Sign in to continue."

Everything else (form, token validation, API call) stays the same.

#### Step 9 — Email Required Validation on Staff Create/Edit Forms

Files:
- `apps/web/src/app/(app)/staff/new/page.tsx`
- `apps/web/src/app/(app)/staff/[id]/edit/page.tsx`

The email field is already in these forms. Change it from optional to:
- `required` prop on the TextField
- `label="Work email *"`
- `helperText="Used to send the login invite"`
- Client-side: validate on blur that it's a valid email format

---

## Part C — Bulk Staff CSV Import (Updated with Invite Flow)

### Goal
Same as before — admin uploads CSV, staff are created, but now:
- Email is required per row (validated)
- Each successfully created staff member automatically gets an invite link
- Import result shows invite URL per row

### Backend — `POST /staff/import`

**File:** `apps/api/src/staff/staff.controller.ts`

Add the endpoint (uses `@UseInterceptors(FileInterceptor('file'))` from `@nestjs/platform-express`):
```typescript
@Post('import')
@RequirePermission('staff.create')
@UseInterceptors(FileInterceptor('file'))
async importStaff(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: AuthenticatedUser,
) {
  return this.staffImportService.importFromCsv(user, file);
}
```

Create a separate **`StaffImportService`** (`apps/api/src/staff/staff-import.service.ts`) to keep the main service clean.

**CSV columns:**
```
firstName,lastName,email,employeeCode,designation,departmentCode,joiningDate,phone
```

**Required columns:** `firstName`, `lastName`, `email`, `employeeCode`
**Optional columns:** `designation`, `departmentCode`, `joiningDate`, `phone`

**Per-row processing:**

```typescript
for each row:
  1. Validate firstName, lastName, email (required + email format)
  2. Validate employeeCode matches /^[a-z0-9-]{2,32}$/
  3. Validate joiningDate is valid ISO date if provided
  4. Resolve departmentCode within org if provided — error if not found
  5. Check no duplicate employeeCode in org
  6. Check no duplicate email in org
  7. Create staff record (email is stored on staff)
  8. Provision login: create User (passwordHash: null) + assign default TEACHER role + generate PasswordResetToken
  9. Build inviteUrl with &isInvite=true
  10. Console.log the invite details
  11. Collect { row, staffId, name, email, inviteUrl, inviteExpiresAt } in successRows
```

**Default role for CSV import:**
Resolve the TEACHER role for the organization. If not found, fall back to STAFF role.
```typescript
const defaultRole = await getOrganizationRoleByCode(prisma, organizationId, 'TEACHER')
  .catch(() => getOrganizationRoleByCode(prisma, organizationId, 'STAFF'));
```

**Response shape:**
```typescript
{
  imported: number;
  skipped: number;
  rows: Array<{
    row: number;
    status: 'imported' | 'error';
    name?: string;         // on success
    email?: string;        // on success
    inviteUrl?: string;    // on success
    inviteExpiresAt?: string; // on success
    employeeCode?: string; // on error
    reason?: string;       // on error
  }>;
}
```

**Security:**
- File MIME type must be `text/csv` or `application/csv` or `text/plain` — reject others
- Max file size: 2MB
- Strip all whitespace from each cell value
- All staff/users belong to `actor.organizationId` — never trust CSV content for org scoping
- Audit log one `STAFF_BULK_IMPORTED` event with count, not per-row (keep audit table clean)

**Module/DI:** Register `StaffImportService` in `apps/api/src/staff/staff.module.ts`. Inject `PrismaService`, `PasswordService`, `ConfigService`, and `AuditService`.

### Frontend — Staff List Page Updates

File: `apps/web/src/app/(app)/staff/page.tsx`

**PageHeader actions** (three buttons total):
1. `"Download sample CSV"` — secondary, `DownloadOutlined` icon — generates and downloads CSV client-side
2. `"Import CSV"` — secondary, `UploadFileOutlined` icon — opens import dialog
3. `"Add staff"` — primary, `AddOutlined` icon — navigates to `/staff/new`

**Sample CSV** (generated client-side via Blob download):
```
firstName,lastName,email,employeeCode,designation,departmentCode,joiningDate,phone
John,Smith,john.smith@school.edu,emp-001,Senior Teacher,science-dept,2024-06-01,+919876543210
Jane,Doe,jane.doe@school.edu,emp-002,Receptionist,admin-dept,2024-07-15,+919876543211
```

**`StaffImportDialog` component** (`apps/web/src/app/(app)/staff/StaffImportDialog.tsx`):

Three states:
1. **Upload state:** File picker (accept `.csv`), "Upload and Import" button, link to "Download sample CSV"
2. **Loading state:** MUI LinearProgress, "Importing staff..." text
3. **Results state:** Summary + table

Results display:
- Green Alert: "✅ X staff members imported successfully"
- If any errors: amber Alert: "⚠️ X rows skipped — see details below"
- Success rows table:

| Name | Email | Employee Code | Invite Link |
|------|-------|---------------|-------------|
| John Smith | john@school.edu | emp-001 | [Copy link] |

- Error rows table:

| Row # | Employee Code | Reason |
|-------|---------------|--------|
| 3 | emp-003 | Email already exists |

- Each "Copy link" button uses `navigator.clipboard.writeText(inviteUrl)` → shows "Copied!" for 2s
- "Close" button at bottom — triggers staff list refresh

---

## Acceptance Criteria

### Part A — Attendance
- [ ] Attendance is NOT in the admin sidebar nav
- [ ] `/reports/attendance` still loads
- [ ] `/staff/attendance` (self-service) still loads

### Part B — Invite Flow
- [ ] Creating a login for a staff member no longer requires a password field
- [ ] After provisioning, API returns `inviteUrl` and `inviteExpiresAt`
- [ ] Console prints invite block with name, email, role, and link
- [ ] Staff detail shows copyable invite link dialog after provisioning
- [ ] Opening the invite URL shows "Welcome to CampusOps! Set your password"
- [ ] A user with `passwordHash: null` cannot log in (returns invalid credentials)
- [ ] After setting password via invite link, user can log in successfully
- [ ] Email is required on staff create form

### Part C — CSV Import
- [ ] `POST /staff/import` requires `staff.create` permission
- [ ] CSV with 5 valid rows: 5 staff created, 5 invite URLs returned
- [ ] CSV with 1 invalid row (missing email): that row errors, others import
- [ ] Duplicate email in org: error for that row with clear message
- [ ] Duplicate employeeCode in org: error for that row
- [ ] Bad employeeCode format: error with format description
- [ ] "Download sample CSV" downloads a valid 3-row CSV
- [ ] Import dialog shows success table with copy-link buttons
- [ ] Import dialog shows error table with row numbers
- [ ] `pnpm --filter @campusops/api typecheck` passes
- [ ] `pnpm --filter @campusops/web typecheck` passes
- [ ] `pnpm --filter @campusops/api test` passes

---

## Files Expected to Change

### Backend
- `apps/api/src/staff/dto/create-staff.dto.ts` — email required
- `apps/api/src/staff/dto/update-staff.dto.ts` — email stays optional
- `apps/api/src/staff/dto/provision-staff-login.dto.ts` — remove password field
- `apps/api/src/staff/staff-login-provisioning.service.ts` — invite token flow
- `apps/api/src/staff/staff.controller.ts` — add import endpoint
- `apps/api/src/staff/staff.module.ts` — register StaffImportService
- `apps/api/src/staff/staff-import.service.ts` — NEW file

### Frontend
- `apps/web/src/app/(app)/staff/page.tsx` — add import + download buttons
- `apps/web/src/app/(app)/staff/StaffImportDialog.tsx` — NEW file
- `apps/web/src/app/(app)/staff/[id]/page.tsx` — invite link dialog, remove password field
- `apps/web/src/app/(app)/staff/new/page.tsx` — email required
- `apps/web/src/app/(app)/staff/[id]/edit/page.tsx` — email required
- `apps/web/src/app/(auth)/reset-password/page.tsx` — detect isInvite=true
