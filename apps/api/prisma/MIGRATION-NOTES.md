# Prisma migration notes

## Purpose

This file documents database constraints that are **intentionally present in PostgreSQL migration SQL** but **not representable in `schema.prisma`**.

Read this before running:

- `pnpm prisma:migrate:dev`
- `prisma migrate diff`
- reviewing generated migration SQL

## Manual constraint: platform role code uniqueness

### Why it exists

`Role` supports:

- organization-scoped roles via `@@unique([organizationId, code])`
- platform-scoped roles via nullable `organizationId`

Auth architecture (`docs/04-AUTH-RBAC-TENANCY.md`) requires platform roles such as `SAAS_SUPER_ADMIN`.

In PostgreSQL, `UNIQUE(organizationId, code)` does **not** prevent duplicate rows like:

```text
(NULL, 'SAAS_SUPER_ADMIN')
(NULL, 'SAAS_SUPER_ADMIN')
```

because `NULL` values do not collide in unique constraints.

### Database constraint

Created in migration:

`20250911010000_identity_rbac_foundation/migration.sql`

```sql
CREATE UNIQUE INDEX "Role_platform_code_key"
  ON "Role"("code")
  WHERE "organizationId" IS NULL;
```

### Why it is not in schema.prisma

Prisma schema language does not support partial/filtered unique indexes (`WHERE ...`).

The Prisma schema still declares:

```prisma
@@unique([organizationId, code])
```

That covers organization-scoped roles only.

### Expected Prisma drift behavior

When PostgreSQL is available, `prisma migrate dev` compares:

```text
schema.prisma  →  shadow database built from migrations
```

The shadow database includes `Role_platform_code_key`, but `schema.prisma` does not.

Prisma may therefore report drift or generate SQL that drops the index.

**Do not apply a generated migration that drops `Role_platform_code_key` unless platform-role architecture is being deliberately changed.**

### Safe migration workflow

1. Run `prisma migrate dev` or inspect `prisma migrate diff` output.
2. If generated SQL includes `DROP INDEX "Role_platform_code_key"`, remove that statement.
3. Keep the manual index in place unless architecture changes.
4. Prefer additive migrations.
5. Never reset the database to "fix" this drift.

### Verification checklist

Before merging a migration that touches `Role`:

- [ ] `Role_platform_code_key` still exists, or removal is explicitly approved
- [ ] `Role_organizationId_code_key` remains intact
- [ ] No unrelated identity/RBAC tables were modified

## Phase history

| Migration | Purpose |
|---|---|
| `20250911000000_init` | Phase 0 foundation placeholder |
| `20250911010000_identity_rbac_foundation` | Phase 1A identity/RBAC tables and constraints |
| `20250912000000_refresh_sessions` | Phase 1B refresh session storage for authentication |
| `20250912100000_departments_staff` | Phase 3 department and staff business models |
| `20250912120000_staff_attendance` | Phase 4 staff attendance records |
| `20250913120000_leave_management` | Phase 5 leave types, balances, and requests |
| `20250915120000_complaints` | Phase 6 complaints and operational history |
| `20250915130000_notices` | Phase 7 notices, audiences, and read tracking |
