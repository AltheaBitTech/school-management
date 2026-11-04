# Phase 1 — UI/UX Foundation
# Run this with Composer 2.5

## Goal
Upgrade the entire CampusOps frontend visual quality from "basic" to "professional SaaS grade".
This phase touches shared layout, theme, landing page, and form standards. No backend changes.

## Context
- Stack: Next.js 15, MUI v6, @mui/icons-material v6 (already installed), TypeScript
- Theme file: `apps/web/src/theme/theme.ts`
- App shell: `apps/web/src/components/layout/AppShell.tsx`
- Landing page: `apps/web/src/app/(app)/page.tsx` (unauthenticated section)
- Auth pages: `apps/web/src/app/(auth)/login/page.tsx` and other auth pages
- Providers: `apps/web/src/components/providers/AppThemeProvider.tsx`

## Task 1 — Upgrade MUI Theme

Update `apps/web/src/theme/theme.ts` with:

### Color palette
- `primary.main`: `#1a56db` (vivid blue — professional and trustworthy)
- `primary.dark`: `#1043a8`
- `primary.light`: `#e8f0fe`
- `secondary.main`: `#0d9488` (teal — action/success accent)
- `background.default`: `#f4f6fb` (soft grey page background)
- `background.paper`: `#ffffff`
- `text.primary`: `#0f172a`
- `text.secondary`: `#475569`
- `divider`: `#e2e8f0`
- `success.main`: `#16a34a`
- `error.main`: `#dc2626`
- `warning.main`: `#d97706`

### Typography
- fontFamily: `'Inter', 'Segoe UI', Roboto, sans-serif`
- h3: fontWeight 700, letterSpacing -0.03em
- h4: fontWeight 700, letterSpacing -0.02em
- h5: fontWeight 650
- h6: fontWeight 600
- subtitle1: fontWeight 600
- body2: fontSize 0.875rem
- button: textTransform none, fontWeight 600, letterSpacing 0.01em

### Shape
- borderRadius: 8

### Component overrides
- `MuiTextField` defaultProps: `{ variant: 'filled', size: 'small' }` — FILLED is the standard variant
- `MuiSelect` defaultProps: `{ variant: 'filled', size: 'small' }`
- `MuiButton` defaultProps: `{ disableElevation: true }`, borderRadius 8
- `MuiPaper` outlined borderColor `#e2e8f0`, borderRadius 10
- `MuiCard` borderRadius 12, boxShadow `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`
- `MuiCardActionArea` hover: soft primary.light background tint
- `MuiTableHead` backgroundColor `#f8fafc`, fontWeight 600, color `#334155`
- `MuiTableRow` hover: `rgba(26, 86, 219, 0.04)`
- `MuiChip` size small, fontWeight 600, borderRadius 6
- `MuiDrawer` paper: override — the AppShell handles this separately
- `MuiTextField` / `MuiFilledInput` — override `-webkit-autofill` to NOT go dark blue:
  ```
  MuiFilledInput: {
    styleOverrides: {
      input: {
        '&:-webkit-autofill': {
          WebkitBoxShadow: '0 0 0 100px #f0f4f8 inset',
          WebkitTextFillColor: '#0f172a',
        },
      },
    },
  }
  ```
- `MuiAppBar` backgroundColor white, borderBottom `1px solid #e2e8f0`
- `MuiDialogTitle` fontWeight 650
- `MuiDialogActions` padding `12px 24px 20px`
- `MuiAlert` borderRadius 8

## Task 2 — Sidebar Redesign (AppShell)

Update `apps/web/src/components/layout/AppShell.tsx`:

### Sidebar visual
- Background: `#0f2044` (deep navy)
- Logo area: white "CampusOps" text + `SchoolOutlined` icon from @mui/icons-material
- Section headers (overline text): `rgba(255,255,255,0.5)`, small uppercase
- Nav item text: `rgba(255,255,255,0.85)` default
- Nav item icon: `rgba(255,255,255,0.7)` default
- Active nav item:
  - background: `rgba(255,255,255,0.12)`
  - left border: `3px solid #4f83f5`
  - text + icon: white full opacity
- Hover nav item: `rgba(255,255,255,0.06)` background
- Bottom of sidebar: user info (name + role label) + sign out — styled in white/muted

### Add icons to every nav item
Import from `@mui/icons-material`. Nav item interface adds `icon: React.ElementType`.

Nav item icon mapping:
- Home → `HomeOutlined`
- Staff → `PeopleAltOutlined`
- Students → `SchoolOutlined`
- Departments → `AccountTreeOutlined`
- Leave → `EventAvailableOutlined`
- Approvals → `ApprovalOutlined` or `TaskAltOutlined`
- Complaints → `BuildOutlined`
- Visitors → `BadgeOutlined`
- Notices → `AnnouncementOutlined`
- Events → `CalendarMonthOutlined`
- Assets → `InventoryOutlined`
- Fees → `ReceiptLongOutlined`
- Documents → `DescriptionOutlined`
- Reports → `BarChartOutlined`
- Registration requests → `HowToRegOutlined`
- My dashboard → `DashboardOutlined`
- My attendance → `CheckCircleOutlined`
- My leave → `TimelapseOutlined`

### TopBar improvement
- Show user display name (first+last from staff profile if available, else email prefix)
- Show role label underneath name in small muted text
- Avatar: initials from name, background `primary.dark`
- "Sign out" → icon button (`LogoutOutlined`) with tooltip, no text label (saves space)
- Notification bell with unread badge count

### Permission-aware navigation
Add a `requiredPermission?: string` field to `NavItem`.
Before rendering a nav item, check `hasPermission(user?.permissions, item.requiredPermission)`.
If user lacks the permission, do not render that nav item.

Permission mapping for each nav item:
- Staff → `staff.view`
- Students → `student.view`
- Departments → `department.view`
- Attendance → (REMOVED from admin nav — see Phase 3)
- Leave → `leave.view`
- Approvals → `approval.view`
- Complaints → `complaint.view`
- Visitors → `visitor.view`
- Notices → `notice.view`
- Events → `event.view`
- Assets → `asset.view`
- Fees → `fee.view`
- Documents → `document.view`
- Reports → any report permission

## Task 3 — Landing Page Redesign

Replace the unauthenticated home section in `apps/web/src/app/(app)/page.tsx` (the `!isAuthenticated` branch).

### Hero section
- Full-width, gradient background: `linear-gradient(135deg, #0f2044 0%, #1a56db 100%)`
- White text: large bold heading "One Platform to Manage Every School Operation"
- Subheading: "CampusOps digitizes complaints, leave, visitors, assets, notices, and every school workflow — replacing paper registers, Excel sheets, and WhatsApp approvals."
- Two CTA buttons: "Register Your School" (contained white) + "Sign In" (outlined white)
- Right side: show a clean MUI illustration or a styled module grid as a "preview" mockup

### Features grid (8 modules)
8 cards in a 4-column grid (2 on mobile). Each card has:
- Module icon (large, `primary.main` color on light blue background chip)
- Module name (bold)
- One-line description

Modules:
1. Complaints & Maintenance — `BuildOutlined` — "Track and resolve facility issues end to end"
2. Leave Management — `EventAvailableOutlined` — "Digital leave requests with approval workflows"
3. Visitor Management — `BadgeOutlined` — "Replace paper registers with digital check-in"
4. Notices & Circulars — `AnnouncementOutlined` — "Publish and track school communications"
5. Asset Management — `InventoryOutlined` — "Track every asset from purchase to retirement"
6. Document Generator — `DescriptionOutlined` — "Generate certificates and letters in one click"
7. Approval Workflows — `TaskAltOutlined` — "Multi-level digital approvals for every request"
8. Event Calendar — `CalendarMonthOutlined` — "Schedule events with venues and participants"

### How it works (3 steps)
Horizontal stepper: Register → Onboard → Operate
Small description under each step.

### Target schools section
Chips: CBSE · ICSE · State Board · International Schools

### Footer
Simple: CampusOps © 2026 · One Platform for School Operations

## Task 4 — Login / Auth Pages

For all auth pages (`login`, `register-organization`, `forgot-password`, `reset-password`, `complete-signup`):
- Center-card layout: max-width 440px, auto margin, white Paper with border, padding 40px
- Logo + name at top of card: `SchoolOutlined` icon (navy) + "CampusOps" text
- Use `variant="filled"` TextField throughout
- Fix label clipping: filled inputs do not clip labels
- Add descriptive helper text under each field (e.g., "Your organization's unique code, e.g. green-valley-school")
- Sign-in button: full width, large size, primary contained
- Forgot password link centered below
- "Back to home" as a text link at the very bottom

## Task 5 — Shared UI Components Upgrade

### PageHeader (`apps/web/src/components/ui/PageHeader.tsx`)
- Add `icon?: React.ElementType` prop
- Render icon to the left of title in a small rounded square with `primary.light` background
- Subtitle rendered in `text.secondary`
- Actions slot: right-aligned

### StatusChip (`apps/web/src/components/ui/StatusChip.tsx`)
- Add icon to each status chip using a small icon from @mui/icons-material
- Semantic colors:
  - ACTIVE, APPROVED, COMPLETED, PUBLISHED, CHECKED_OUT, PAID → green (`success`)
  - PENDING, IN_PROGRESS, ASSIGNED, DRAFT, SCHEDULED, PENDING_APPROVAL → amber (`warning`)
  - INACTIVE, REJECTED, CLOSED, ARCHIVED, CANCELLED, OFFBOARDED → grey (`default`)
  - CRITICAL, OPEN (complaint) → red (`error`)
  - CHECKED_IN → blue (`info`)

### EmptyState (in `AppTable.tsx`)
- Add `icon?: React.ElementType` prop
- Render icon centered above the message text
- Icon size: 48px, color `text.disabled`

### LoadingState
- Replace plain CircularProgress with MUI Skeleton rows matching the expected table structure

## Acceptance Criteria
- [ ] Sidebar is deep navy with icons and permission filtering
- [ ] Login page uses filled inputs, no label clipping, no dark autofill
- [ ] Landing page has hero, feature grid, how-it-works, footer
- [ ] All nav items have icons
- [ ] StatusChip has semantic colors + icon
- [ ] PageHeader has icon slot
- [ ] No hardcoded colors outside theme
- [ ] `pnpm --filter @campusops/web typecheck` passes
