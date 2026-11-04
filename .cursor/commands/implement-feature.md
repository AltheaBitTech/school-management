# Implement Feature

Use this workflow whenever implementing a meaningful feature.

## Before starting

1. Check `docs/19-DECISIONS-AND-PLAN.md` — verify the feature aligns with decisions made.
2. Read `docs/00-IMPLEMENTATION-BLUEPRINT.md`.
3. Read the most relevant domain/workflow documentation.
4. Inspect the existing module(s) and similar features.

## UI Standards (mandatory)

- Input variant: `filled` — never `outlined` in forms
- Sidebar nav items need `requiredPermission` — hide if user lacks it
- All new form pages use `FormSection` groupings
- Submit button shows spinner while loading, disabled during submit
- Success → Snackbar; Error → Alert above form; Destructive → MUI Dialog confirmation
- Icons from `@mui/icons-material` for all nav items, page headers, status chips
- See rules `07-ui-ux.mdc` and `11-forms-validation.mdc`

## Implementation Steps

1. Define acceptance criteria.
2. Identify database changes (Prisma schema + migration).
3. Identify API changes (endpoint, DTO, permission guard, tenant scope).
4. Identify permissions and tenant checks.
5. Implement backend (controller → service → Prisma).
6. Implement frontend (page → client lib → UI components).
7. Add audit/notification behavior where required.
8. Add/update tests.
9. Run validation:
   ```
   pnpm --filter @campusops/api typecheck
   pnpm --filter @campusops/web typecheck
   pnpm --filter @campusops/api test
   pnpm --filter @campusops/web test
   ```
10. Review the diff — no unrelated file changes.
11. Update documentation if architecture or API contract changed.

## Final response

Summarize:
- What changed and why
- Files changed (list them)
- Tests run and results
- Any assumptions made
- Any remaining follow-up items
