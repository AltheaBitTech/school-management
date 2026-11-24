# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CampusOps: a multi-tenant Operations Management SaaS for schools, colleges and institutes (staff, attendance, leave, complaints, visitors, notices, assets, fees, transport, documents, approvals, events). It complements an academic ERP — do not grow it into a full academic ERP. pnpm monorepo:

- `apps/api` — NestJS 11 modular monolith, Prisma 6, PostgreSQL (`@campusops/api`)
- `apps/web` — Next.js 15 App Router, React 19, MUI v6 (`@campusops/web`)

Design docs live in `docs/` (`00-IMPLEMENTATION-BLUEPRINT.md` … `17-APPROVAL-WORKFLOW.md`). Read the relevant domain doc before changing a module or the schema. `.cursor/rules/*.mdc` holds the project's coding rules; the important parts are summarized below.

## Institution types and terminology

Each organization has an `institutionType` (`SCHOOL`, `COLLEGE`, `INSTITUTE`; default `SCHOOL`), chosen at registration. Labels that differ by type (School/College/Institute, Class/Program/Course, Section/Division/Batch, Principal/Dean/Director, Term/Semester/Module) come from one terminology dictionary:

- API: `apps/api/src/common/terminology/terminology.ts` (`resolveTerminology(type, settings.terminology)`), exposed on `/auth/me` as `organization.terminology`.
- Web: `useTerminology()` from `apps/web/src/lib/terminology/use-terminology.ts`.

Never hard-code "School", "Class", "Section" or "Principal" in user-facing copy. Role codes (`SCHOOL_ADMIN`, `PRINCIPAL`), API routes (`/classes`) and permissions (`class.*`) stay stable; only display labels change. The Prisma model `AcademicUnit` is mapped to the legacy `SchoolClass` table.

## Commands

Run from the repo root unless noted.

```bash
pnpm install
pnpm db:up                     # Postgres 16 via docker compose (container campusops-postgres)
pnpm prisma:generate           # re-run after every schema.prisma change / pull
pnpm prisma:migrate:dev        # create/apply dev migrations
pnpm prisma:migrate:deploy     # apply existing migrations only
pnpm prisma:seed               # global permission catalog + platform roles
pnpm bootstrap:platform-admin  # needs PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD in apps/api/.env
pnpm --filter @campusops/api seed:org-roles   # re-seed role definitions into existing orgs

pnpm dev                       # api (:3001, nest --watch) + web (:3000) in parallel
pnpm dev:api | pnpm dev:web
pnpm build | pnpm lint | pnpm typecheck | pnpm test
```

API: base path `/api/v1`, Swagger at `http://localhost:3001/docs`, health at `/api/v1/health`.

### Tests

- API: Jest (`*.spec.ts` next to source; `test/setup-env.js` provides default env vars). Web: Vitest + Testing Library, jsdom (`*.test.ts(x)`).
- Single API test: `pnpm --filter @campusops/api exec jest src/leave/leave.integration.spec.ts` (or `-t "name"`).
- Single web test: `pnpm --filter @campusops/web exec vitest run src/theme/theme.test.ts`.
- `*.integration.spec.ts` files hit a real Postgres and are skipped unless `RUN_DB_TESTS=true`. `test/setup-env.js` defaults `DATABASE_URL` to `localhost:5432`, and dotenv does not override variables that are already set. If the local DB runs on another port, pass `DATABASE_URL=...` explicitly.

### Local env gotchas

- Env files: root `.env` (docker compose + shared), `apps/api/.env` (Nest loads `.env` from its cwd), `apps/web/.env.local` (`NEXT_PUBLIC_API_URL`). Startup validates required vars (`src/config/`).
- A stale generated Prisma client shows up as `TS2305: Module '@prisma/client' has no exported member ...`. Fix it with `pnpm prisma:generate`.
- On this machine a Homebrew Postgres also listens on 127.0.0.1:5432, so the Docker DB is mapped to 5433 through `POSTGRES_PORT` and the `DATABASE_URL`/`DIRECT_URL` values in the env files.

## Backend architecture (apps/api/src)

- One Nest module per business domain (`leave/`, `staff/`, `complaints/`, `visitors/`, …). Each module has a thin controller, services holding the business logic, `dto/` (class-validator), `constants/` (stable error codes such as `LEAVE_ERROR_CODES`) and `utils/`. Controllers → services → Prisma; no Prisma queries in controllers.
- `bootstrap.ts#createApp()` holds the shared app setup: global prefix, CORS allow-list from env (never `*`), cookie-parser, whitelist/forbid ValidationPipe, `GlobalExceptionFilter`, and Swagger. `main.ts` calls `listen()` on it. `api/index.ts` wraps it as a Vercel serverless function (`vercel.json`, which also defines the cron hitting `cron/` endpoints, guarded by `cron-secret.guard.ts`).
- **Request security chain**: `@UseGuards(JwtAuthGuard, PermissionsGuard)` on the controller, plus `@RequirePermissions('leave.view', ...)` on each handler (AND semantics; `common/decorators`). `PermissionsGuard` resolves effective permissions from the user's **active role** (`user.activeRoleId`; users can hold several roles and switch between them). Use `@CurrentUser()` to get `AuthenticatedUser` and `@Public()` for unauthenticated routes. `ThrottlerGuard` is global.
- **Tenancy**: `organizationId` always comes from `AuthenticatedUser`, never from the client. Every tenant-owned query is scoped with it (`findFirst({ where: { id, organizationId } })`, not `findUnique({ id })`). Related IDs must be checked against the same org. Order of checks: auth → org context → permission → resource access → business rules.
- Permissions follow `resource.action`, with `resource.self.action` for self-service. The catalog is in `permissions/constants/system-permissions.ts` and role definitions (`ORGANIZATION_ROLE_DEFINITIONS`) in `permissions/constants/system-roles.ts`. Roles are seeded per organization at onboarding; resolve them by `organizationId + roleCode`, never by hard-coded ID. There are two tiers: platform roles (the `campusops-platform` org, `platform/`, `organization-registrations/`) and school org roles (SCHOOL_ADMIN, PRINCIPAL, TEACHER, RECEPTIONIST, MAINTENANCE_STAFF, ACCOUNTANT, STAFF, STUDENT, PARENT).
- **Shared capabilities**: reuse these instead of duplicating them: `auth`, `rbac`/`permissions`/`roles`, `approvals`, `notifications`, `files` (storage provider abstraction: local vs Supabase, chosen by config), `audit`, `documents` (PDFs via pdfkit), `reports`, and `common/features` (env feature flags such as `FEATURE_ATTENDANCE_ENABLED`, enforced by guards like `attendance-feature.guard.ts`).
- **Approvals** are a generic multi-level workflow engine (`approvals/`: workflows → levels → requests → actions). A domain plugs in through an `*-approval-integration.service.ts` (e.g. `leave/leave-approval-integration.service.ts`), which receives a `Prisma.TransactionClient` and finalizes the domain state inside the approval transaction.
- Multi-step state changes (leave approval + balance, asset transfer, fee payment, attendance correction, approval completion) must run in `prisma.$transaction`. Use explicit transition endpoints (`POST /leave/requests/:id/approve`) rather than free-form status updates. Collections are paginated with a max page size and allow-listed filter/sort fields.
- Prisma (`apps/api/prisma/schema.prisma`): UUID PKs, `organizationId` on tenant-owned models, tenant-scoped uniques (`@@unique([organizationId, code])`), indexes for real query patterns, and no casual hard-deletes of historical records. Don't add speculative tables.

## Frontend architecture (apps/web/src)

- Route groups in `app/`: `(public)` landing, `(auth)`, `(onboarding)`, `(platform)` platform admin, and `(app)` the tenant app (shell from `components/layout/AppShell.tsx`; sub-areas include `student/` and `parent/` portals).
- `lib/<domain>/*-client.ts` is where API calls live. All of them go through `lib/api/client.ts` (`ApiError` carrying `statusCode` + `code`, automatic refresh-token retry via cookie, redirect on session loss). Don't call `fetch` directly from components. The access token is held in memory only (`lib/auth/session.ts`); the refresh token is an httpOnly cookie.
- Permissions on the client are UX only. Use `useCan` / `useCanEvery` (`lib/auth/use-can.ts`) and `hasPermission` (`lib/auth/routing.ts`). Every `AppShell` nav item declares its required permission and is hidden if the user lacks it.
- UI conventions (from `.cursor/rules/07-ui-ux.mdc`, `11-forms-validation.mdc`):
  - Use the theme tokens in `theme/theme.ts`; don't hard-code colors. The theme has light and dark color schemes (`colorSchemes`, CSS variables, toggle in `components/layout/ColorModeToggle.tsx`), so every screen must look right in both: use palette paths (`'primary.main'`, `'divider'`), `theme.vars.palette.*`, or `brandVars` from `theme/theme.ts` (gradient, glass, shadows). `theme.palette.*` only holds light values. In `sx`, give radii in px (`'12px'`) because numeric `borderRadius` is multiplied by `shape.borderRadius` (12).
  - `AppTable` turns rows into labelled cards on phones (labels are copied from the header cells); use `ResponsiveTable` for tables inside an existing Card. Pass `mobileCards={false}` only for wide data grids that must scroll.
  - Inputs are always `variant="filled"`. Required labels end in ` *`. Validate on blur and on submit, with specific error messages in `helperText`.
  - Page shells from `components/ui`: `ListPageShell` + `AppTable` + `TableIconLink`, `FormPageShell` + `FormSection` + `FormPageFooter`, `DetailPageShell` + `DetailFactRow`, `PageHeader`, `StatusChip` (semantic status colors), `EmptyState`, and Skeleton for loading states.
  - Use `ConfirmDialog` for destructive actions (never `window.confirm`/`alert`), and `useAppSnackbar().showSuccess()/showError()` for mutation feedback.
  - Every screen handles loading, empty, error, success, permission-denied, and responsive states. Don't show raw UUIDs or error codes to users.
  - Before adding a new component or pattern, check whether an existing one can be extended.

## Definition of done

A feature isn't done when CRUD works. Validation, authorization, tenant isolation, UX states, and business rules must all be covered by tests, and security-sensitive features need negative tests (at minimum: a Tenant A user cannot access a Tenant B resource). Update `docs/` when architecture or the API contract changes. Prefer the existing project pattern over a new abstraction, and avoid adding infrastructure (Redis, queues, microservices) unless the workload requires it.
