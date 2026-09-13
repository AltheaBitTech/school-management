# CampusOps — Frontend Architecture

**Document:** 06-FRONTEND-ARCHITECTURE.md  
**Product:** School Operations Management SaaS / CampusOps  
**Status:** Architecture specification  
**Previous:** 05-BACKEND-ARCHITECTURE.md  
**Next:** 07-STUDENT-ACADEMIC-WORKFLOWS.md

---

## 1. Purpose

This document defines the frontend architecture for CampusOps.

The target frontend is a **Next.js application** designed for school administrators, principals, teachers, maintenance staff, receptionists, accountants, and other operational users.

The frontend should provide:

- role-aware navigation,
- dashboards,
- forms,
- tables,
- search/filtering,
- workflow screens,
- notifications,
- document/file interactions,
- responsive layouts,
- consistent API integration,
- a polished and professional SaaS user experience.

The frontend is a presentation and user-experience layer.

> **Frontend authorization improves UX; backend authorization remains the real security boundary.**

---

# 2. Frontend Principles

CampusOps follows these principles:

1. **Feature-oriented organization**
2. **Server-first rendering where useful**
3. **Client components only when interaction requires them**
4. **One centralized API client**
5. **Consistent server-state management**
6. **Reusable UI primitives**
7. **Permission-aware UI**
8. **No tenant/security decisions based only on hidden UI**
9. **Forms use shared validation patterns**
10. **Tables support pagination/filtering consistently**
11. **Loading/error/empty states are first-class**
12. **Avoid global state unless genuinely required**
13. **Keep domain features independent**
14. **Use an established design system rather than reinventing basic components**
15. **Follow established UX and accessibility principles**
16. **Optimize for maintainability before premature performance tuning**

---

# 3. High-Level Frontend Architecture

```text
                    ┌──────────────────────┐
                    │      Browser         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Next.js App       │
                    │                      │
                    │ Routes / Layouts     │
                    │       ↓              │
                    │ Feature Components   │
                    │       ↓              │
                    │ Hooks / Queries      │
                    │       ↓              │
                    │ API Client           │
                    └──────────┬───────────┘
                               │ HTTPS
                               ▼
                    ┌──────────────────────┐
                    │     NestJS API       │
                    └──────────────────────┘
```

The frontend does not directly access PostgreSQL or other backend infrastructure.

---

# 4. Recommended Next.js Structure

A practical App Router structure:

```text
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── staff/
│   │   ├── complaints/
│   │   ├── leave/
│   │   ├── visitors/
│   │   ├── notices/
│   │   ├── assets/
│   │   ├── documents/
│   │   ├── approvals/
│   │   ├── events/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── settings/
│   │
│   ├── error.tsx
│   └── not-found.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── feedback/
│   └── common/
│
├── features/
│   ├── auth/
│   ├── students/
│   ├── staff/
│   ├── complaints/
│   ├── leave/
│   ├── visitors/
│   ├── notices/
│   ├── assets/
│   ├── documents/
│   ├── approvals/
│   ├── events/
│   ├── reports/
│   └── notifications/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── permissions/
│   ├── validation/
│   ├── utils/
│   └── constants/
│
├── hooks/
├── types/
└── public/
```

The Next.js frontend lives in `apps/web/`. Route and feature boundaries should remain clear within that application.

---

# 5. Route Organization

Routes should reflect product domains.

```text
/dashboard
/students
/students/[id]
/staff
/staff/[id]
/complaints
/complaints/[id]
/leave
/leave/[id]
/visitors
/notices
/assets
/assets/[id]
/documents
/approvals
/events
/reports
/notifications
/settings
```

Avoid deeply nested routes unless the URL communicates a meaningful resource relationship.

---

# 6. Authentication Pages

Public authentication routes:

```text
/login
/forgot-password
/reset-password
```

Potential future routes:

```text
/verify-email
/invite/[token]
/onboarding
```

Authentication pages should remain visually separate from the dashboard shell.

---

# 7. Dashboard Layout

Authenticated users should enter a shared dashboard shell.

```text
┌──────────────────────────────────────────────────┐
│ Header                                            │
│ School / User / Notifications / Profile          │
├───────────────┬──────────────────────────────────┤
│ Sidebar       │                                  │
│               │ Page content                     │
│ Dashboard     │                                  │
│ Students      │                                  │
│ Staff         │                                  │
│ Complaints    │                                  │
│ Leave         │                                  │
│ Visitors      │                                  │
│ Notices       │                                  │
│ Assets        │                                  │
│ Documents     │                                  │
│ Approvals     │                                  │
│ Events        │                                  │
│ Reports       │                                  │
└───────────────┴──────────────────────────────────┘
```

The sidebar should be permission-aware.

---

# 8. Role-Aware Navigation

Navigation should be generated from the user's effective permissions.

Example:

```text
User has:
complaint.view
complaint.create
leave.view
leave.create

Navigation:
✓ Complaints
✓ Leave
✗ Assets administration
✗ User management
```

Hiding an item is only a UX optimization.

A user who manually navigates to the URL must still be rejected by the backend if unauthorized.

---

# 9. Permission Utility

Use a centralized permission utility.

Example:

```ts
can("complaint.create")
```

or:

```ts
hasPermission(user, "asset.update")
```

Avoid scattering role-name checks across components.

---

# 10. Authentication State

The frontend needs a reliable representation of:

```text
authenticated / unauthenticated
current user
organization context
permissions
session state
```

The exact token handling follows the backend authentication design.

The frontend should not store sensitive credentials unnecessarily.

If refresh authentication uses secure HttpOnly cookies, JavaScript should not attempt to read the refresh token.

---

# 11. Route Protection

Authenticated dashboard routes should be protected.

```text
Request protected route
        ↓
Check authentication/session
        ↓
Authenticated?
   ┌────┴────┐
  No        Yes
  ↓          ↓
Login     Render route
```

Server-side protection should be preferred where practical.

The backend still validates every API request.

---

# 12. Unauthorized vs Not Found

The frontend should distinguish:

```text
401 → session/authentication problem
403 → authenticated but not permitted
404 → resource not found
```

For security-sensitive resources, the backend may intentionally return not-found when a resource belongs to another tenant.

---

# 13. API Client

All backend calls should go through a centralized API client.

```text
lib/api/
├── client.ts
├── auth.ts
├── students.ts
├── staff.ts
├── complaints.ts
├── leave.ts
├── visitors.ts
├── notices.ts
├── assets.ts
├── documents.ts
├── approvals.ts
├── events.ts
└── reports.ts
```

Avoid calling `fetch()` directly from dozens of unrelated components.

---

# 14. API Client Responsibilities

The API client should handle:

- base URL,
- credentials/cookies,
- headers,
- JSON serialization,
- error normalization,
- request IDs where appropriate,
- authentication-related responses,
- common response parsing.

Domain API functions should remain small.

Example:

```ts
complaintsApi.list(filters)
complaintsApi.getById(id)
complaintsApi.create(payload)
complaintsApi.update(id, payload)
complaintsApi.changeStatus(id, status)
```

---

# 15. Server State vs UI State

Keep these concepts separate.

### Server State

```text
students
staff
complaints
leave requests
assets
notices
events
reports
notifications
```

### UI State

```text
modal open/closed
selected tab
form draft
sidebar collapsed
table selection
filter panel visibility
```

Do not place all server data into one global store unnecessarily.

---

# 16. React Query / Server-State Management

A query library such as TanStack Query is a good fit for:

- caching,
- fetching,
- mutations,
- retries,
- invalidation,
- loading states,
- stale data handling.

Conceptually:

```text
Complaint List
      ↓
useQuery()
      ↓
complaintsApi.list()
      ↓
NestJS API
```

After a mutation:

```text
Create complaint
      ↓
Mutation succeeds
      ↓
Invalidate complaint list
      ↓
Refresh affected queries
```

---

# 17. Query Key Strategy

Use predictable query keys.

```text
["complaints", filters]
["complaint", complaintId]
["students", filters]
["student", studentId]
["notifications", userId]
```

Consistent query keys make invalidation predictable.

---

# 18. Forms

Forms should use reusable patterns.

A suitable approach is:

```text
React Hook Form
+
Zod or equivalent schema validation
```

Frontend validation improves UX.

Backend DTO validation remains authoritative.

```text
Form
 ↓
Client validation
 ↓
API request
 ↓
Backend DTO validation
 ↓
Business validation
```

---

# 19. Form Error Handling

Display errors at the correct level.

### Field error

```text
"Title is required"
```

### Business error

```text
"Leave balance is insufficient"
```

### Permission error

```text
"You do not have permission to approve this request."
```

### Network/server error

```text
"Something went wrong. Please try again."
```

Do not expose raw backend stack traces.

---

# 20. UI/UX & Design Quality Standards

CampusOps should provide a **modern, professional SaaS experience**, not a collection of disconnected CRUD screens.

The interface should feel consistent across every module and should follow established UX, accessibility, and usability principles.

## 20.1 Design Goals

The UI should provide:

- clean, modern, professional school-management SaaS appearance,
- consistent visual language,
- clear information hierarchy,
- minimal cognitive load,
- responsive layouts,
- accessible interactions,
- readable typography,
- predictable feedback after actions,
- consistent spacing, sizing, icons, colors, and component behavior,
- low visual clutter,
- progressive disclosure where appropriate,
- clear confirmation for destructive actions,
- easy scanning of important operational information.

The goal is **polished and professional**, not flashy.

---

## 20.2 Preferred Design System

Use **Material UI (MUI)** or an equivalent mature component/design system.

MUI is the preferred option for the initial implementation because CampusOps needs a large set of reliable production UI primitives without spending time reinventing basic components.

The design system should cover:

```text
Buttons
Inputs
Selects
Autocomplete
Dialogs
Drawers
Tabs
Cards
Tables
Pagination
Menus
Tooltips
Badges / Chips
Alerts
Snackbars
Date/Time Pickers
Skeletons
Progress indicators
```

Do not independently design basic controls for every feature.

Preferred hierarchy:

```text
Design System
      ↓
Shared UI Components
      ↓
Feature Components
      ↓
Business Screens
```

---

## 20.3 UX Standards

The application should follow established usability principles:

### Consistency

The same action should look and behave similarly everywhere.

### Visibility of System Status

Users should clearly understand when something is:

```text
Loading
Processing
Successful
Failed
Saved
Pending
```

### Error Prevention

Prevent invalid actions where possible rather than relying only on error messages afterward.

### Clear Error Recovery

Errors should explain:

```text
What happened
Why it happened when useful
What the user can do next
```

### Recognition Over Recall

Users should not have to remember information unnecessarily between screens.

### Efficient Workflows

Frequently performed school operations should require minimal unnecessary clicks.

### Accessibility

Support:

- keyboard navigation,
- visible focus states,
- labels,
- semantic structure,
- readable contrast,
- accessible dialogs,
- meaningful error messages.

### Responsive Behavior

Layouts should adapt appropriately to desktop, tablet, and mobile rather than simply shrinking a desktop interface.

---

## 20.4 Operational UX

CampusOps is an **operations-heavy application**, so frequently used workflows should prioritize speed and clarity.

Example visitor check-in:

```text
Visitor arrives
    ↓
Search/Create visitor
    ↓
Enter visit details
    ↓
Check In
    ↓
Success confirmation
```

Complaint workflow:

```text
Complaint
   ↓
Assign
   ↓
Update status
   ↓
Complete
```

The interface should make these workflows obvious without unnecessary navigation.

---

## 20.5 Visual Consistency

Define design tokens for:

```text
Typography
Spacing
Border radius
Elevation
Icon sizing
Form heights
Table density
Status colors
Priority indicators
Breakpoints
```

Status and priority must have consistent visual meanings throughout the application.

For example:

```text
OPEN
ASSIGNED
IN_PROGRESS
COMPLETED
CLOSED

LOW
MEDIUM
HIGH
CRITICAL
```

should use consistent badges/chips and interaction patterns wherever they appear.

---

## 20.6 Don't Over-Design

Avoid:

- excessive animations,
- unnecessary gradients,
- overly decorative dashboards,
- huge cards for simple information,
- excessive modals,
- inconsistent custom controls,
- animations that slow operational workflows.

The interface should feel like a **serious production SaaS product used by schools every day**.

---

# 21. Tables

Operational modules will rely heavily on tables.

Reusable table features should include:

```text
Pagination
Sorting
Filtering
Search
Column visibility where useful
Row actions
Loading state
Empty state
Error state
```

Examples:

```text
Complaint table
Leave table
Visitor table
Asset table
Notice table
Approval table
Staff table
Student table
```

---

# 22. Table URL State

Where practical, important filters should be reflected in URL query parameters.

Example:

```text
/complaints?status=OPEN&priority=HIGH&page=2
```

Benefits:

- shareable views,
- browser back/forward support,
- refresh persistence,
- easier debugging.

Do not put every small UI state into the URL.

---

# 23. Search UX

Search inputs should avoid firing a network request on every keystroke.

Use:

```text
debounce
```

where appropriate.

```text
Type "maintenance"
      ↓
Wait briefly
      ↓
Query API
```

For exact identifiers such as admission numbers or asset codes, search behavior can be optimized separately.

---

# 24. Loading States

Every data-driven page should have a deliberate loading state.

Examples:

```text
Skeleton
Spinner for small action
Disabled submit button
Table loading rows
```

Avoid blank screens while data is loading.

---

# 25. Empty States

An empty list is not an error.

Example:

```text
No complaints found.

[Create Complaint]
```

The empty state should explain the situation and, where appropriate, provide the next action.

---

# 26. Error States

A failed API request should provide:

- understandable message,
- retry option where useful,
- preserved user input when possible.

Example:

```text
Unable to load complaints.

[Retry]
```

Do not silently swallow API errors.

---

# 27. Confirmation Dialogs

Use confirmation for destructive or important actions.

Examples:

```text
Delete user
Retire asset
Reject approval
Archive notice
Cancel event
```

The consequence should be clear.

---

# 28. Toast Notifications

Use toast/snackbar feedback for short-lived results.

Examples:

```text
Complaint created
Notice published
Asset assigned
Leave approved
Document generated
```

Do not use toasts as the only place for important errors that require action.

---

# 29. Dashboard Architecture

Dashboards should be composed from reusable widgets.

```text
Dashboard
├── KPI Cards
├── Complaint Summary
├── Leave Summary
├── Visitor Activity
├── Asset Summary
├── Upcoming Events
└── Recent Notices
```

Widgets should obtain data through domain query hooks rather than duplicating API logic.

---

# 30. Role-Specific Dashboards

### School Admin

```text
Operational KPIs
Users
Complaints
Leave
Visitors
Assets
Notices
Approvals
Events
```

### Principal

```text
School overview
Pending approvals
Complaint trends
Leave trends
Events
Important notices
```

### Teacher

```text
Assigned/accessible students
Leave
Notices
Relevant events
Operational items
```

### Maintenance Staff

```text
Assigned complaints
Open maintenance work
Asset maintenance
Relevant notifications
```

### Receptionist

```text
Visitor management
Check-in/out
Notices
Relevant events
```

### Accountant

```text
Relevant approvals
Operational/financial information allowed by permissions
```

The backend remains responsible for enforcing actual data scope.

---

# 31. Student Screens

The initial operations product can provide:

```text
Student list
Student profile
Student search
Guardian information
Documents
Relevant operational history
```

Do not turn the frontend into a full academic ERP unless that scope is explicitly added.

---

# 32. Staff Screens

Staff functionality can include:

```text
Staff list
Staff profile
Department
Leave
Documents
Relevant assignments
Operational history
```

Role-specific actions should be permission-aware.

---

# 33. Complaint Screens

Recommended screens:

```text
Complaint list
Complaint details
Create complaint
Edit complaint
Assign complaint
Comments/activity
Attachments
Status transition
```

Detail view:

```text
Title
Category
Priority
Status
Reporter
Assignee
Description
Attachments
Comments
History
Actions
```

---

# 34. Leave Screens

Recommended screens:

```text
My Leave
Leave Requests
Leave Request Details
Create Leave Request
Approval Queue
Leave Balances
```

Actions depend on permissions:

```text
Submit
Approve
Reject
Cancel
```

---

# 35. Visitor Screens

Recommended screens:

```text
Visitor Register
New Visitor / Visit
Check-in
Active Visitors
Visit Details
Check-out
Visitor History
```

Reception-focused screens should prioritize speed because these are front-desk workflows.

---

# 36. Notice Screens

Recommended screens:

```text
Notice List
Create Notice
Edit Draft
Preview
Publish
Scheduled Notices
Archived Notices
Notice Details
Read/Acknowledgement status
```

Audience selection should support:

```text
Teachers
Students
Parents
Departments
Entire School
```

---

# 37. Asset Screens

Recommended screens:

```text
Asset List
Asset Details
Create Asset
Assign Asset
Transfer Asset
Maintenance
History
Retire Asset
QR/Barcode view
```

The asset detail page should make current assignment and history easy to understand.

---

# 38. Document Screens

Recommended screens:

```text
Templates
Template Editor
Generate Document
Generated Documents
Document Preview
Download
```

Template placeholders should be presented clearly.

Example:

```text
{{student.name}}
{{student.admissionNumber}}
{{organization.name}}
```

---

# 39. Approval Screens

Recommended screens:

```text
My Requests
Approval Queue
Request Details
Approval History
```

An approval detail page should show:

```text
Request
Requester
Current step
Previous actions
Comments
Available action
```

Only users with the required approval permission should see actionable controls.

---

# 40. Event Screens

Recommended screens:

```text
Calendar
Event List
Create Event
Event Details
Participants
Venue
Reminders
```

The calendar should provide both visual planning and a list-oriented fallback.

---

# 41. Reports Screens

Reports should provide:

```text
Report type
Filters
Date range
Preview
Export
```

Examples:

```text
Complaint report
Leave report
Visitor report
Asset report
Document report
Approval report
Event report
```

The UI should not imply access to data the user's permissions do not allow.

---

# 42. Notification Center

A centralized notification center can provide:

```text
Unread count
Notification list
Read/unread state
Related resource
Timestamp
```

Examples:

```text
Leave request approved
Complaint assigned
New school notice
Approval requires your action
Upcoming event
```

---

# 43. File Upload UX

File uploads should show:

```text
Selected file
Size/type validation
Upload progress where appropriate
Success/failure
Remove/retry
```

The frontend should enforce user-friendly restrictions, but the backend must validate again.

---

# 44. Responsive Design

CampusOps should support:

```text
Desktop
Tablet
Mobile
```

Priority:

```text
Desktop-first for administration
Responsive support for operational/mobile usage
```

Reception and maintenance workflows should remain usable on smaller screens.

---

# 45. Accessibility

The UI should follow practical accessibility standards:

- semantic HTML,
- keyboard navigation,
- visible focus states,
- labels for form fields,
- accessible dialogs,
- sufficient text contrast,
- screen-reader-friendly controls,
- meaningful error messages.

Accessibility should be part of reusable component design.

---

# 46. Design System

Create reusable primitives for:

```text
Button
Input
Select
Textarea
Checkbox
Radio
Dialog
Dropdown
Tabs
Badge
Card
Table
Pagination
Tooltip
Toast
Skeleton
EmptyState
ErrorState
```

Domain features should compose these components rather than creating slightly different versions of the same control.

---

# 47. Layout Components

Common layout components:

```text
AppShell
Sidebar
Header
Breadcrumbs
PageHeader
ContentContainer
MobileNavigation
UserMenu
NotificationMenu
```

Keep layout components independent from individual domain business logic.

---

# 48. Data Formatting

Centralize formatting for:

```text
Dates
Times
Currency
Status labels
Priorities
File sizes
Phone numbers
```

Avoid repeated formatting logic across components.

---

# 49. Status and Enum Presentation

Backend enums should not be displayed directly everywhere.

Example:

```text
IN_PROGRESS
```

should render as:

```text
In Progress
```

Use centralized mappings:

```text
status → label
status → badge variant
```

---

# 50. Client-Side Caching

Cache stable/read-heavy data appropriately:

```text
Departments
Complaint categories
Leave types
Asset categories
Venues
User permissions
```

Avoid aggressive caching for rapidly changing operational data unless invalidation is reliable.

---

# 51. Mutation Invalidation

After mutations, invalidate only affected queries.

Example:

```text
Create Complaint
  ↓
Invalidate:
["complaints"]
["dashboard", ...]
```

Avoid refreshing the entire application after every mutation.

---

# 52. Optimistic Updates

Use optimistic updates selectively.

Good candidates:

```text
Mark notification as read
Toggle a lightweight preference
```

Use caution for:

```text
Leave approval
Asset transfer
Complaint status
Notice publishing
```

---

# 53. Authentication Expiry UX

If an authenticated request returns a session-expiration response:

```text
Attempt refresh if supported
      ↓
Refresh succeeds → retry safely
      ↓
Refresh fails → clear session
      ↓
Redirect to login
```

Avoid infinite retry loops.

---

# 54. Security Boundaries

The frontend must never be trusted for:

```text
tenant isolation
permissions
ownership
approval authority
resource access
```

The frontend may use permissions to decide:

```text
show/hide navigation
enable/disable actions
display role-specific widgets
```

The backend always rechecks.

---

# 55. Avoid Client-Side Tenant Switching

If the application supports only one active school context, organization context should not be freely editable by the user.

If multi-organization membership is added later:

```text
User
 ↓
Available organizations
 ↓
Select organization
 ↓
Server validates membership
 ↓
Authenticated organization context
```

The browser cannot select an organization merely by changing a URL or local state.

---

# 56. Environment Configuration

Frontend environment configuration should distinguish public and private values.

Example:

```text
NEXT_PUBLIC_API_URL
```

Never expose:

```text
JWT secrets
database credentials
provider API keys
storage private keys
```

through `NEXT_PUBLIC_*`.

---

# 57. Performance Strategy

Start with sensible defaults:

- server rendering where useful,
- dynamic imports for heavy UI,
- paginated lists,
- image optimization,
- query caching,
- debounced search,
- avoid unnecessary client components.

Measure before introducing complex caching or state infrastructure.

---

# 58. Large Lists

For large datasets:

```text
Students
Staff
Visitors
Assets
Complaints
```

use server-side:

```text
pagination
filtering
sorting
search
```

Do not download thousands of records just to filter them in the browser.

---

# 59. Reports and Exports

Large report generation should be a backend responsibility.

Frontend flow:

```text
Select filters
     ↓
Request report
     ↓
Backend generates export
     ↓
Frontend receives controlled download
```

For very large exports, a future asynchronous job model can provide:

```text
Requested
Processing
Ready
Failed
```

---

# 60. Frontend Testing

Use multiple levels.

### Component Tests

```text
buttons
forms
dialogs
tables
permission-aware rendering
```

### Feature Tests

```text
create complaint
submit leave
check in visitor
publish notice
assign asset
approve request
```

### E2E Tests

```text
Login → Dashboard
Create complaint → Assign → Complete
Submit leave → Approve
Register visitor → Check-in → Check-out
Create notice → Publish → Read
Create asset → Assign → Transfer
Generate document → Download
```

---

# 61. Permission UI Tests

For permission-aware components:

```text
Permission present → action visible
Permission absent → action hidden/disabled
```

But backend authorization must also be tested.

---

# 62. Error Boundary Strategy

Use application-level error boundaries for unexpected rendering failures.

Provide:

```text
Friendly message
Retry/reload option
Request/reference ID where useful
```

Do not expose internal stack traces.

---

# 63. Observability

Frontend errors should be diagnosable.

Useful metadata:

```text
route
timestamp
request ID where available
user/session context where appropriate
browser/runtime information
```

Avoid sending sensitive personal data unnecessarily to error tracking systems.

---

# 64. Internationalization

The initial release may use one language if product requirements allow it.

Avoid hard-coding user-visible strings deeply inside reusable components so a future i18n layer can be introduced without rewriting the UI.

---

# 65. Feature Ownership

Each domain feature should own its:

```text
components
hooks
API functions
types
validation schemas
UI-specific utilities
```

Example:

```text
features/
└── complaints/
    ├── api.ts
    ├── hooks.ts
    ├── types.ts
    ├── schemas.ts
    ├── components/
    └── utils/
```

Shared UI belongs in `components/ui`.

---

# 66. Common vs Feature Components

Use `components/ui` for generic components:

```text
Button
Dialog
Table
Input
Card
Badge
```

Use feature folders for domain-specific components:

```text
ComplaintStatusBadge
LeaveApprovalActions
VisitorCheckInForm
AssetAssignmentDialog
```

Do not place every component into one giant shared folder.

---

# 67. Recommended Feature Pattern

A typical feature can look like:

```text
features/complaints/
├── api.ts
├── hooks.ts
├── types.ts
├── schemas.ts
├── constants.ts
├── components/
│   ├── ComplaintTable.tsx
│   ├── ComplaintForm.tsx
│   ├── ComplaintStatusBadge.tsx
│   └── ComplaintDetails.tsx
└── utils/
```

This keeps feature code close together.

---

# 68. Recommended Frontend Implementation Order

### Phase 1 — Foundation

```text
Next.js setup
Design system / MUI
App shell
Authentication
API client
Error handling
Query infrastructure
Permissions
```

### Phase 2 — Core Operations

```text
Dashboard
Students
Staff
Complaints
Leave
Notices
Notifications
```

### Phase 3 — Operational Management

```text
Visitors
Assets
Documents
Files
```

### Phase 4 — Workflow & Insights

```text
Approvals
Events
Reports
Advanced dashboards
```

---

# 69. Frontend Definition of Done

A feature is not complete just because its page renders.

- [ ] Route exists
- [ ] Authentication protection added
- [ ] Permission-aware navigation/actions
- [ ] API integration
- [ ] DTO/request types
- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Form validation where required
- [ ] Pagination/filtering where required
- [ ] Mutation feedback
- [ ] Accessibility basics
- [ ] Responsive layout
- [ ] UX consistency with design system
- [ ] Backend authorization verified
- [ ] Component/feature tests
- [ ] E2E coverage for critical flows

---

# 70. Final Frontend Architecture

```text
                         Next.js
                            │
                ┌───────────┴───────────┐
                │                       │
             App Router             App Shell
                │                       │
                └───────────┬───────────┘
                            │
                    Feature Modules
                            │
       ┌──────────┬─────────┼──────────┬───────────┐
       ▼          ▼         ▼          ▼           ▼
    Students   Complaints  Leave     Assets     Notices
       │          │         │          │           │
       └──────────┴─────────┴──────────┴───────────┘
                            │
                    Hooks / Server State
                            │
                       API Client
                            │
                          HTTPS
                            │
                            ▼
                       NestJS API
```

The frontend remains a clean consumer of the backend API.

---

# 71. Summary

The CampusOps frontend should be a **feature-oriented Next.js application** with:

```text
App Router
+
MUI / mature design system
+
Consistent UX standards
+
Permission-aware UX
+
Central API client
+
Server-state management
+
Reusable forms/tables
+
Responsive layouts
+
Strong loading/error/empty states
+
Accessibility
```

The most important security principle remains:

> **The frontend decides what to show; the backend decides what is allowed.**

The most important product-quality principle is:

> **Every screen should feel like part of one polished SaaS product, not a separate CRUD application.**

This provides a strong foundation for a professional, maintainable CampusOps frontend.

---

**Next document:** `07-STUDENT-ACADEMIC-WORKFLOWS.md`
