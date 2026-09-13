# CampusOps — Implementation Blueprint

## 1. Purpose

This document is the bridge between the CampusOps architecture documentation and implementation.

The 13 architecture documents describe the product, domains, database, security, backend, frontend, workflows, API, deployment, and roadmap.

This blueprint answers a more practical question:

> **In what order should we build the system, what must be true before each step, and what standards must every implementation follow?**

This is the working implementation source of truth.

---

# 2. Source Documents

The implementation should be guided by:

```text
01 PRODUCT SCOPE
02 DOMAIN ARCHITECTURE
03 DATABASE ARCHITECTURE
04 AUTH / RBAC / TENANCY
05 BACKEND ARCHITECTURE
06 FRONTEND ARCHITECTURE
07 STUDENT / ACADEMIC WORKFLOWS
08 STAFF / ATTENDANCE / LEAVE
09 FEES / TRANSPORT / ASSETS
10 NOTIFICATIONS / DOCUMENTS / AUDIT
11 API CONTRACT
12 SECURITY / DEPLOYMENT
13 IMPLEMENTATION ROADMAP
```

If implementation conflicts with a documented architectural decision, update the documentation deliberately rather than silently introducing a different design.

---

# 3. Architecture Baseline

Initial technology direction:

```text
Repository structure
  apps/api   = NestJS backend
  apps/web   = Next.js frontend

Frontend
  Next.js
  TypeScript
  App Router
  MUI / mature component system
  Query/server-state library

Backend
  NestJS
  TypeScript
  Modular monolith
  Prisma

Database
  PostgreSQL

Infrastructure
  Simple managed deployment initially
  Durable object storage when required
  Optional Redis/worker later
```

Avoid premature:

- Microservices
- Kafka
- Kubernetes
- Multiple databases
- Complex event infrastructure
- Specialized attendance hardware

---

# 4. Core Architectural Rules

## Rule 1 — Backend is the security boundary

Frontend authorization is UX.

Backend authorization is security.

Every protected operation must validate:

```text
Authentication
→ Organization
→ Permission
→ Resource access
→ Business rules
```

---

## Rule 2 — Tenant isolation is mandatory

Every tenant-owned operation must be organization-scoped.

Never rely on:

```text
organizationId from frontend
```

as proof of authorization.

---

## Rule 3 — Modules own business state

Examples:

```text
Leave → owns LeaveRequest
Asset → owns Asset
Complaint → owns Complaint
Attendance → owns StaffAttendance
```

Shared services provide capabilities but should not own unrelated business state.

---

## Rule 4 — Reuse shared capabilities

Prefer reusable:

```text
Auth
RBAC
Notifications
Files
Approvals
Audit
Activity
Reports
```

over implementing custom versions inside every module.

---

## Rule 5 — Preserve history

Do not destroy operational history merely to remove an active record.

Prefer:

```text
Inactive
Archived
Offboarded
Retired
```

where appropriate.

---

# 5. MVP Boundary

The first implementation should focus on the operational platform.

### Foundation

- Organization
- Users
- Authentication
- RBAC
- Tenant isolation
- Departments

### People

- Staff
- Students
- Guardians

### Core workflows

- Staff attendance
- Leave
- Complaints
- Notices
- Visitors
- Assets
- Documents
- Approvals
- Events

### Platform

- Notifications
- Audit
- Activity
- Reports
- Dashboard

### Later

- Advanced fees/accounting
- GPS transport
- Biometric attendance
- Inventory
- Procurement
- Vendor management
- AI
- ERP integrations
- Mobile applications

---

# 6. Implementation Order

The recommended order is:

```text
00 Blueprint
      ↓
Project Foundation
      ↓
Database Foundation
      ↓
Organization + Authentication
      ↓
RBAC + Permissions
      ↓
Users + Departments
      ↓
Staff
      ↓
Students + Guardians
      ↓
Attendance
      ↓
Leave + Approval
      ↓
Complaints
      ↓
Notices
      ↓
Visitors
      ↓
Assets
      ↓
Documents
      ↓
Events
      ↓
Fees
      ↓
Transport
      ↓
Notifications Hardening
      ↓
Reports + Dashboards
      ↓
Audit Hardening
      ↓
Security / Production
```

---

# 7. Phase 0 — Repository & Development Foundation

Before business features:

### Repository structure

```text
apps/api   = NestJS backend
apps/web   = Next.js frontend
```

### Backend

- Create NestJS application
- Configure TypeScript
- Configure Prisma
- Configure PostgreSQL
- Global validation
- Global exception handling
- Configuration validation
- Logging
- Health check
- Swagger
- Request/correlation ID
- Graceful shutdown

### Frontend

- Create Next.js application
- App Router
- TypeScript
- MUI/theme
- App shell
- API client
- Query/server state
- Form validation
- Error/loading/empty states

### Development

- ESLint
- Formatting
- Unit test setup
- Integration test setup
- E2E test setup
- Environment templates
- Git hooks only where useful

---

# 8. Phase 1 — Database Foundation

Create:

```text
Organization
OrganizationSettings
User
Role
Permission
RolePermission
UserRole
```

Then:

```text
Department
Staff
Student
ParentGuardian
StudentGuardian
```

Then operational models incrementally.

Do not create hundreds of speculative tables before the corresponding workflow is understood.

---

# 9. Phase 2 — Authentication & Tenancy

Implement:

```text
Register
Login
Refresh
Logout
Password Reset
Email Verification if enabled
```

Security requirements:

- Password hashing
- Short-lived access token
- Refresh rotation
- Revocation
- Account status
- Tenant context

Create automated tests for cross-tenant access immediately.

---

# 10. Phase 3 — RBAC

Implement:

```text
Role
Permission
RolePermission
UserRole
```

Use permission names such as:

```text
staff.view
staff.create
attendance.mark
leave.approve
asset.transfer
report.attendance
audit.view
```

Create reusable NestJS authorization guards/decorators.

---

# 11. Phase 4 — Staff & Departments

Implement complete vertical slice:

```text
Database
 ↓
Prisma
 ↓
Service
 ↓
Controller
 ↓
API
 ↓
Frontend
 ↓
Authorization
 ↓
Audit
 ↓
Tests
```

Staff capabilities:

- Create
- Read
- Update
- Deactivate
- Search
- Filter
- Department
- Designation
- Reporting manager

---

# 12. Phase 5 — Students & Guardians

Keep the CampusOps boundary clear.

Implement:

- Student profile
- Student code
- Guardian relationship
- Status
- Basic documents
- Search/filter

If a School ERP is the academic source of truth, prepare integration/import boundaries instead of recreating the ERP.

---

# 13. Phase 6 — Staff Attendance

Implement:

```text
StaffAttendance
```

with:

```text
staffId
organizationId
attendanceDate
checkInAt
checkOutAt
status
lateFlag
earlyDepartureFlag
remarks
```

Initial workflows:

- Check-in
- Check-out
- Admin marking
- Daily attendance
- History
- Correction
- Finalization

Important constraint:

```text
UNIQUE(organizationId, staffId, attendanceDate)
```

unless future multi-session attendance requires a different model.

---

# 14. Phase 7 — Leave + Approval

Implement:

```text
LeaveType
LeaveBalance
LeaveRequest
ApprovalWorkflow
ApprovalStep
ApprovalRequest
ApprovalAction
```

Workflow:

```text
Submit
 ↓
Validate
 ↓
Pending Approval
 ↓
Approve / Reject
 ↓
Update Balance
 ↓
Notify
 ↓
Audit
```

Use transactions for approval and balance changes.

---

# 15. Phase 8 — Complaints & Maintenance

Implement:

- Complaint
- Assignment
- Priority
- Status
- Comments/history
- Attachments
- Maintenance workflow
- Notifications
- Reports

Server-side state transitions must be explicit.

---

# 16. Phase 9 — Notices

Implement:

- Notice
- Audience
- Attachment
- Scheduling
- Publish
- Read
- Acknowledge
- Archive

The audience model must support the product requirements without exposing notices across organizations.

---

# 17. Phase 10 — Visitors

Optimize this module for reception workflow speed.

Implement:

- Visitor
- Visit
- Check-in
- Check-out
- Host
- Purpose
- Vehicle number
- Photo
- Visitor pass

A normal visitor check-in should require minimal interaction.

---

# 18. Phase 11 — Assets

Implement:

```text
Asset
AssetCategory
AssetAssignment/Transfer
AssetMaintenance
AssetHistory
```

Workflows:

```text
Register
 → Assign
 → Transfer
 → Maintain
 → Retire
```

QR/barcode should identify the asset but should not expose sensitive information.

---

# 19. Phase 12 — Documents

Implement:

- File metadata
- Storage abstraction
- Document templates
- Template versioning
- PDF generation
- Generated documents
- Protected downloads

Initial templates:

```text
Bonafide
Character Certificate
Experience Letter
Salary Certificate
Visitor Pass
Employee ID Card
Student ID Card
```

---

# 20. Phase 13 — Events

Implement:

- Event
- Venue
- Participants
- Event types
- Calendar
- Reminders
- Archive

Keep the first calendar implementation simple.

---

# 21. Phase 14 — Fees

Initial operational scope:

- Fee structures
- Components
- Student assignments
- Payment recording
- Receipts
- Outstanding amounts
- Basic reporting

Do not build a full accounting ledger unless product requirements expand.

---

# 22. Phase 15 — Transport

Implement:

- Routes
- Stops
- Vehicles
- Staff/driver
- Student route assignment
- Basic reports

Defer:

- GPS
- Live ETA
- Route optimization
- Driver app

---

# 23. Phase 16 — Shared Services Hardening

Improve:

### Notifications

- Templates
- Delivery state
- Retry
- Idempotency
- Preferences
- Provider abstraction

### Files

- Validation
- Private storage
- Authorization
- Download control

### Audit

- Coverage
- Correlation IDs
- Immutable semantics

---

# 24. Phase 17 — Dashboards & Reports

Dashboards should be role-aware.

Do not build a single dashboard containing every metric.

Use operationally useful widgets:

```text
Pending approvals
Open complaints
Today's attendance
Visitors currently inside
Outstanding fees
Upcoming events
Warranty expiries
```

Reports should support:

- Filters
- Date ranges
- Pagination where relevant
- Authorization
- Export

---

# 25. Phase 18 — Security Review

Perform a deliberate security pass after the main workflows exist.

Test:

- Cross-tenant access
- BOLA/IDOR
- Role escalation
- Permission bypass
- File access
- Token replay
- Password reset abuse
- Rate limits
- Input validation
- Malicious files
- Report/export access

---

# 26. Phase 19 — Production Readiness

Validate:

```text
Build
 ↓
Test
 ↓
Migration
 ↓
Deploy
 ↓
Health Check
 ↓
Smoke Test
```

Production should have:

- HTTPS
- Restricted CORS
- Secrets management
- Database backups
- Restore procedure
- Monitoring/logging
- Graceful shutdown
- Rollback strategy

---

# 27. Feature Development Standard

Every new feature should follow:

```text
Requirement
 ↓
Domain decision
 ↓
Database change
 ↓
Migration
 ↓
Business service
 ↓
API contract
 ↓
Authorization
 ↓
Frontend UX
 ↓
Audit/notification if needed
 ↓
Tests
 ↓
Documentation
```

Do not start by writing UI or Prisma models in isolation.

---

# 28. Definition of Done

A feature is done only when:

- [ ] Requirements are understood
- [ ] Domain ownership is clear
- [ ] Database is implemented
- [ ] Migration works
- [ ] DTO validation exists
- [ ] Business rules exist
- [ ] Authorization exists
- [ ] Tenant isolation exists
- [ ] API is implemented
- [ ] Frontend is implemented
- [ ] Loading/empty/error states exist
- [ ] Audit is implemented where needed
- [ ] Notifications are implemented where needed
- [ ] Tests cover important behavior
- [ ] Documentation is updated

---

# 29. AI-Assisted Development Standard

AI can accelerate implementation, but generated code must follow project architecture.

Before asking AI to implement a feature, provide:

```text
Relevant architecture document
Relevant workflow
Relevant database model
Relevant API contract
Existing code pattern
Acceptance criteria
```

The AI should not invent architecture when the repository already defines it.

Generated code must be reviewed for:

- Tenant isolation
- Authorization
- Validation
- Transactions
- Error handling
- Performance
- Consistency with existing patterns
- Test coverage

---

# 30. Code Review Questions

Every meaningful PR/change should answer:

### Architecture

- Does this belong in the correct module?
- Did we duplicate an existing shared capability?
- Did we introduce unnecessary infrastructure?

### Security

- Is tenant isolation enforced?
- Is resource authorization enforced?
- Can a user manipulate IDs to access another resource?

### Data

- Are constraints/indexes correct?
- Are historical records preserved?
- Is concurrency handled?

### UX

- Are loading/error/empty states handled?
- Is the workflow obvious?
- Is the UI consistent with the design system?

### Operations

- Are failures observable?
- Are retries safe?
- Is the operation idempotent where necessary?

---

# 31. Avoid These Patterns

Do not:

- Put Prisma queries directly into controllers.
- Trust frontend `organizationId`.
- Use frontend permissions as security.
- Duplicate notification provider code.
- Publicly expose protected files.
- Delete historical records casually.
- Add Redis because it sounds scalable.
- Create microservices before scale requires them.
- Build complex dashboards before core workflows.
- Generate huge speculative schemas.
- Let AI invent different conventions per feature.
- Mark CRUD as complete when the workflow is incomplete.

---

# 32. First Vertical Slice

The first serious end-to-end slice should be:

```text
Organization
   ↓
User
   ↓
Authentication
   ↓
Role / Permission
   ↓
Department
   ↓
Staff
   ↓
Staff Profile UI
```

Then immediately prove:

```text
Tenant A user
    X
Tenant B staff
```

This validates the most important architectural boundary before many modules depend on it.

---

# 33. Second Vertical Slice

Then:

```text
Staff
 ↓
Attendance
 ↓
Check-in
 ↓
Check-out
 ↓
History
 ↓
Audit
```

This proves:

- Auth
- Tenant isolation
- Staff relationship
- Database constraints
- API
- Frontend
- Business rules
- Audit

---

# 34. Third Vertical Slice

Then:

```text
Staff
 ↓
Leave
 ↓
Approval
 ↓
Balance
 ↓
Notification
 ↓
Audit
```

This validates the reusable workflow architecture.

---

# 35. Architecture Change Process

When a requirement changes:

```text
Requirement Change
      ↓
Impact Analysis
      ↓
Domain
      ↓
Database
      ↓
API
      ↓
Backend
      ↓
Frontend
      ↓
Security
      ↓
Tests
      ↓
Documentation
```

Do not patch one layer and forget the others.

---

# 36. Project Completion Criteria

The MVP is ready when:

- Core workflows work end-to-end.
- Tenant isolation has been tested.
- RBAC/permissions work.
- Staff/attendance/leave work.
- Complaints/notices/visitors/assets work.
- Documents/approvals/events work.
- Basic fees/transport work if included in MVP.
- Notifications work through the selected provider abstraction.
- Audit exists for important operations.
- Reports work.
- Production deployment is repeatable.
- Backup/restore is understood.
- Critical security tests pass.

---

# 37. Final Working Principle

The project should optimize for:

```text
Clarity
+
Consistency
+
Security
+
Small Deployable Steps
+
Reusable Architecture
+
Real User Workflows
```

The objective is not maximum code generation.

The objective is to create a system where each new feature becomes easier because the previous feature established a strong pattern.

> **Build one correct pattern, reuse it everywhere, and only introduce complexity when the product genuinely needs it.**
