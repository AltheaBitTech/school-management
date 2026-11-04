# UI Design Elevation — CampusOps “Premium SaaS” Plan
# Run phases with Composer 2.5 (one phase per session). No backend unless noted.

## Why it still feels “basic”

Phase 1 defined the target, but delivery is **partial and uneven**:

| Area | Target (rules + Phase 1) | Current gap |
|------|--------------------------|-------------|
| **Theme** | Full MUI overrides, default `filled` + `small` | Theme exists; not every page uses defaults consistently |
| **Auth / public** | Unified `AuthPageCard` (440px) | `register-organization` uses custom 560px layout — OK but different visual language |
| **App shell** | Navy sidebar, icons, user block, top bar polish | Mostly done; dashboard home may still feel empty |
| **PageHeader + icon** | Every list/detail page | Many pages use title only — **icon prop often missing** |
| **FormSection** | Grouped forms with overlines | Most create/edit pages are flat `TextField` stacks |
| **Empty / loading** | Icon empty states, **Skeleton** tables | `EmptyState` is text-only on many pages; spinners still common |
| **Feedback** | Snackbar on every mutation | Many flows use inline Alert only or silence |
| **Detail pages** | Card-based sections, stat chips, clear hierarchy | Often single `Paper` or raw stacks |
| **Landing** | Hero gradient + mockup + trust | `PublicLandingPage` exists — verify hero depth vs reference |
| **Micro-interactions** | Hover, focus rings, dialog polish | Default MUI — little motion or depth layering |

**Root cause:** Features shipped faster than **pattern enforcement**. Fix = **design system + page audit**, not a new UI library.

---

## North star (what “great” means for CampusOps)

**Product type:** B2B school operations admin (Teachmint Ops, Fedena, Classpro admin — not consumer social).

**Feel:**
- **Trustworthy** — navy + blue, clean tables, no clutter
- **Dense but readable** — admins scan lists all day; whitespace with purpose
- **Consistent** — same header, same form sections, same empty state, same success toast
- **Role-aware** — student portal simpler; admin richer

**References (pick patterns, don’t clone):**
- Sidebar density: Linear / Vercel dashboard
- Forms: Stripe settings sections
- Tables: GitHub issue list (filters + empty + skeleton)
- Public marketing: modern EdTech landing (hero + proof + steps)

**Non-goals:** shadcn rewrite, custom CSS framework, dark mode v1, animation overload.

---

## Architecture: 5 layers (build bottom-up)

```text
L1  Tokens & theme     → theme.ts, globals.css
L2  Shell              → AppShell, auth layouts, public layouts
L3  Primitives         → PageHeader, FormSection, AppTable, StatusChip, EmptyState, ConfirmDialog, AppSnackbar
L4  Page templates     → ListPage, DetailPage, FormPage (compose L3)
L5  Module polish      → Staff, Visitors, Fees… apply templates + copy
```

---

## Phase A — Design system hardening (1 session) ✅ done

**Goal:** One source of truth; stop one-off layouts.

### A1 — Extend `theme.ts`
- Confirm defaults: `MuiTextField`, `MuiSelect` → `variant: 'filled'`, `size: 'small'`
- Add `MuiSnackbar` / standard duration if using global provider
- Subtle elevation scale on `MuiPaper` / `MuiCard` (already partially in Phase 1)
- `MuiLink` color from `primary.main`

### A2 — New shared primitives (only if missing)
| Component | Purpose |
|-----------|---------|
| `AuthMarketingLayout` | Wrap login, forgot, reset, complete-signup, register-org — **one** header/footer (optional split: card 440 vs 560 via prop) |
| `AppSnackbarProvider` | `useAppSnackbar().showSuccess('Staff updated')` — replace ad-hoc alerts |
| `ConfirmDialog` | Delete/offboard/archive — no `window.confirm` |
| `ListPageShell` | `PageHeader` + filter row + `Paper` table container + padding standard |
| `DetailPageShell` | Header + 2-column grid (main + sidebar meta card) on `md+` |
| `FormPageShell` | `PageHeader` + `FormSection` blocks + sticky footer actions |

**Files:** `apps/web/src/components/ui/*`, `apps/web/src/components/providers/*`

### A3 — EmptyState & LoadingState upgrade
- `EmptyState`: required `icon`, optional `action` button (e.g. “Add staff”)
- `LoadingState`: table skeleton rows (match `AppTable` columns)

**Acceptance:** typecheck; Storybook optional; 2 example pages migrated to `ListPageShell`.

---

## Phase B — Shell & first impression (1 session) ✅ done

**Goal:** Login + landing + dashboard feel “product”, not “template”.

### B1 — Unify public/auth chrome
- Extract shared top brand bar from `register-organization` + `AuthPageCard` → `PublicBrandHeader`
- Register school: same brand, optional wider card (`maxWidth={560}`)

### B2 — Landing (`PublicLandingPage.tsx`)
- Hero: gradient + **product mock** (styled screenshot frame or module mini-dashboard)
- Social proof row: “Built for CBSE · ICSE · …” (exists — strengthen typography)
- Footer: links Register · Sign in · Privacy placeholder

### B3 — Authenticated home (`(app)/page.tsx` logged-in)
- Role-based **dashboard cards**: pending approvals, today’s visitors, open complaints (permission-gated)
- Quick actions row with icons
- Empty dashboard for limited roles → friendly copy, not blank

**Acceptance:** Screenshot-ready landing; logged-in admin sees at least 3 metric cards when data exists.

---

## Phase C — List pages audit (2 sessions) ✅ done

**Goal:** Every module list looks like the same product.

**Audit checklist (apply to each `*/page.tsx` list):**
- [x] `PageHeader` with **module icon** (via `ListPageShell`)
- [x] Primary action in header (contained, with icon) where applicable
- [x] Filters in outlined `Paper` via `ListPageShell` `filters` prop
- [x] `AppTable` (outlined container from `AppTable`)
- [x] `LoadingState` skeleton with `columnCount`
- [x] `EmptyState` with icon + CTA
- [x] Row hover; status via `StatusChip` only

**Migrated list pages:** staff, visitors, complaints, approvals, notices, events, assets, students, documents, leave, departments, reports hub, fees overview, fee structures, student fees.

**Still on raw `PageHeader` (Phase D/F or lower traffic):** attendance, report sub-pages, staff self-service lists, student portal.

**Acceptance:** 8+ high-traffic lists pass checklist; grep shows no raw `<table>` outside `AppTable`.

---

## Phase D — Forms & detail pages (2 sessions) ✅ done

**Goal:** Create/edit/detail feel structured, not “form dump”.

### D1 — Form pages
- Wrap with `FormPageShell`
- Split into `FormSection` (title + description + fields)
- Footer: Cancel (text) + Save (contained), right-aligned via `FormPageFooter`
- Success: `useAppSnackbar` + navigate back

**Migrated forms:** staff new/edit, student new/**edit**, visitor check-in, document generate, **fee structures** (`/fees/structures/new`).

### D2 — Detail pages
- `DetailPageShell`: title row + status chip + actions (Edit, …)
- Content: `Grid2` — main facts left, timeline/meta right (`DetailFactRow` helper)
- Staff detail: login block as elevated `Card` with icon header

**Migrated details:** staff `[id]`, student `[id]`, visitor `[id]`, document `[id]`.

**Shared additions:** `FormPageFooter`, `FormSection.description`, `DetailFactRow`.

**Acceptance:** 5 detail pages match template; forms use `FormSection` on 5 create/edit pages.

---

## Phase E — Feedback, dialogs, micro-polish (1 session) ✅ done

- Success snackbars on key mutations (departments, fee assign, fee structure create, student edit, existing form flows)
- Destructive actions → `ConfirmDialog`: staff deactivate, visitor checkout, leave type deactivate
- High-traffic list row actions → `TableIconLink` (IconButton + tooltip): staff, students, visitors, documents, assets, student fees
- Sidebar nav: `focus-visible` outline + 150ms hover transition in `AppShell`

**Acceptance:** No `window.confirm` for migrated flows; table “View” uses icon pattern on primary lists.

---

## Phase F — Student portal & print views (1 session) ✅ Done

- Student self nav: lighter visual weight (`StudentPortalPageShell`, narrower main column when student role)
- Visitor pass: `PrintPreviewFrame` (toolbar, dashed preview, print-only duplicate)
- Documents list: `DocumentTypeChip` with type icons

---

## Enforcement (keep it from regressing)

1. **Rule:** `.cursor/rules/07-ui-ux.mdc` — add “must use ListPageShell / FormPageShell when adding new pages”
2. **PR checklist:** PageHeader icon? FormSection? EmptyState icon? Snackbar on save?
3. **Visual QA script** (manual, 30 min before demo):

| Route | Check |
|-------|--------|
| `/` logged out | Hero + CTAs |
| `/login` | Card, filled fields, platform toggle |
| `/staff` | Header icon, table paper, empty state |
| `/visitors` | Same |
| `/visitors/[id]/pass` | Print preview |
| Student role home | Portal nav only |

---

## Execution order (recommended)

| Week | Composer prompt |
|------|-----------------|
| 1 | Phase A — primitives + EmptyState/Skeleton |
| 1 | Phase B — auth unify + landing + dashboard |
| 2 | Phase C session 1 — Staff, Visitors, Complaints, Approvals |
| 2 | Phase C session 2 — rest of lists |
| 3 | Phase D — forms + details |
| 3 | Phase E — snackbars + confirm dialogs |
| 4 | Phase F — student portal + print polish |

---

## Composer prompt template (copy per phase)

```markdown
Implement Phase [X] from `.cursor/commands/ui-design-elevation.md`.

Constraints:
- MUI v6 only; filled inputs; theme tokens only
- Reuse/extend existing components in apps/web/src/components/ui
- Do not change API
- Migrate [N] pages listed in that phase
- Run pnpm --filter @campusops/web typecheck and vitest for touched tests

When done, list pages migrated and any new shared components.
```

---

## Success metrics (subjective but clear)

- [ ] New developer can add a list page in <30 min using shells only
- [ ] No page uses Tailwind or raw HTML layout for structure
- [ ] Demo walkthrough: 10 screens, zero “this looks unfinished” moments
- [ ] Stakeholder compares favorably to Teachmint/Fedena **admin** UX (not student app)
