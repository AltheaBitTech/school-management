# Phase 6 — Form elevation
# Implement this phase only. Spec: `docs/23-REMAINING-WORK-PLAN.md`.

## Goal

Bring the remaining create/edit and list pages onto the shared shells and the validation rules in `docs/22-FORM-VALIDATION-STANDARDS.md`.

## Already done — do not rewrite

These pages already use `FormPageShell`: staff new/edit, student new/edit, visitor check-in, complaint create, document generate, fee structure create, staff leave create, settings logo.

Report pages already use `ReportFilterPanel` and disable CSV export when there are no rows. Leave them unless a page still uses a raw filter stack.

## Pages to migrate

Create/edit → `FormPageShell` + `FormSection` + `FormPageFooter`:

- `apps/web/src/app/(app)/notices/new/page.tsx`
- `apps/web/src/app/(app)/notices/[id]/edit/page.tsx`
- `apps/web/src/app/(app)/events/new/page.tsx`
- `apps/web/src/app/(app)/events/[id]/edit/page.tsx`
- `apps/web/src/app/(app)/assets/new/page.tsx`
- `apps/web/src/app/(app)/assets/[id]/edit/page.tsx`
- `apps/web/src/app/(app)/leave/new/page.tsx`

Lists that still use a bare `PageHeader` → `ListPageShell` (icon, filters, `LoadingState`, `EmptyState` with icon):

- `apps/web/src/app/(app)/attendance/page.tsx`
- `apps/web/src/app/(app)/leave/types/page.tsx`
- Staff self-service lists under `apps/web/src/app/(app)/staff/` that are still raw headers (attendance and leave lists only)

## Validation

On each migrated form:

- Required fields and date order checked before the request is sent.
- Inline error or snackbar with a plain sentence. Map `ApiError.message` on failure.
- Primary button disabled while `isSubmitting`.
- Notices: at least one audience; a scheduled notice requires a datetime (same rule as the API).
- Assets: assign staff or student, not both, matching `AssignAssetDto`.
- Leave: start date on or before end date.

Reuse `FileAttachmentUploadField` only where the API already accepts file ids (notices, complaints). Do not add leave attachments.

## Out of scope

New fields, new endpoints, Zod on every form, visual redesign of pages that already use the shells.

## Done when

- The pages listed above use the shells.
- `pnpm --filter @campusops/web typecheck` passes.
- Existing web tests for notices, leave, or assets still pass. Add a test only if a page already has one and the submit guard changed.
