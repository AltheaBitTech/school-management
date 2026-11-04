# Phase 11 — Platform plans and analytics
# Implement this phase only. Spec: `docs/23-REMAINING-WORK-PLAN.md`.

## Goal

`SAAS_SUPER_ADMIN` can see how many schools are on the platform and which plan each school is on, and can change that plan. Schools see their plan and a warning if they are over the plan’s student or staff count. No payment is collected.

## Data

- `Plan`: `code` unique (`TRIAL`, `STANDARD`), `name`, `studentLimit` (int), `staffLimit` (int), `active`. Seed both. Suggested limits: TRIAL 50 students / 10 staff, STANDARD 2000 / 500. Limits are product numbers, not billing math.
- `OrganizationSubscription`: `organizationId` unique, `planId`, `status` (`TRIAL`, `ACTIVE`, `CANCELLED`), `currentPeriodStart`, `currentPeriodEnd` (nullable). No price column and no payment id.

On organization create (registration approval and any direct create path), insert a `TRIAL` subscription if one does not exist. Existing organizations get `TRIAL` from the migration backfill.

Changing a plan does not delete school data.

## API

Caller must be a platform user. These routes are not organization-scoped queries with a client-supplied org id used as authority. Load the target organization by id only after the platform permission check.

- `GET /platform/plans` — `platform.organization.view`
- `GET /platform/subscriptions` — list organizations with plan code, status, student count, staff count. `platform.organization.view`. Counts are numbers, not rosters.
- `PATCH /platform/organizations/:organizationId/subscription` — body `{ planCode, status }`. New permission `platform.subscription.manage`, granted only to `SAAS_SUPER_ADMIN`.
- `GET /platform/analytics` — `platform.organization.view`. Response counts only: organizations by status, subscriptions by plan code, pending registration requests, total students, total staff. No names of students or staff.
- `GET /organizations/current/subscription` — any authenticated org user. Returns plan name, code, limits, current student count, current staff count, `overStudentLimit`, `overStaffLimit`.

Over-limit flags are informational. Do not block student or staff create in this phase.

## UI

Follow the existing platform registrations screen (`apps/web/src/app/(app)/admin/registrations/page.tsx`) and the platform home on `(app)/page.tsx`.

- Platform home: three cards from `/platform/analytics` (schools, pending registrations, students).
- `/admin/subscriptions`: table of schools, plan, status, counts, and a dialog to change plan and status. Show it for `platform.subscription.manage`.
- School dashboard (`dashboard.view`): if `overStudentLimit` or `overStaffLimit`, one `Alert` with the plan name and the counts. No upgrade button and no checkout.

Sidebar: “Subscriptions” next to the existing platform registrations item.

## Tests

- Org user calling `PATCH /platform/organizations/:id/subscription` → 403.
- Platform user can change a plan; the school’s `GET /organizations/current/subscription` shows the new code.
- Analytics payload has no student or staff name fields.
- A school user cannot read another organization’s subscription by guessing an id (the current-org route ignores any client org id).
- Over-limit is true when the student count is greater than `studentLimit`, and create-student still succeeds.

## Out of scope

Stripe, Razorpay, invoices, proration, hard enforcement, emails when a trial ends.

## Done when

- A super admin can set a school’s plan, and that school sees the plan and an over-limit alert.
- API typecheck, web typecheck, and the tests above pass.
