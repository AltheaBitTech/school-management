# CampusOps — Implementation Roadmap

## 1. Purpose

This roadmap converts the architecture documentation into an implementation sequence.

The goal is to build CampusOps incrementally while keeping the system usable, secure, and deployable at every major phase.

The recommended architecture remains:

```text
Next.js
   ↓
NestJS Modular Monolith
   ↓
PostgreSQL + Prisma
```

with provider abstractions for notifications and file storage.

---

# 2. Implementation Strategy

Build in vertical slices rather than creating every database table first and postponing business workflows.

Each phase should ideally produce:

- Backend functionality
- Database migrations
- API contract
- Frontend screens
- Authorization
- Audit where applicable
- Tests
- Documentation updates

A feature is not complete merely because its CRUD endpoints exist.

---

# 3. Phase 0 — Project Foundation

## Repository structure

```text
apps/api   = NestJS backend
apps/web   = Next.js frontend
```

## Backend

Set up:

- NestJS
- Prisma
- PostgreSQL
- Global validation
- Configuration module
- Logging
- Error handling
- Health checks
- Swagger/OpenAPI
- Request/correlation ID
- Graceful shutdown

## Frontend

Set up:

- Next.js App Router
- TypeScript
- MUI or equivalent design system
- Central API client
- Server-state/query library
- Form validation
- App shell
- Error/loading/empty-state patterns

## Infrastructure

Set up:

- Local PostgreSQL
- Environment templates
- Development scripts
- Linting
- Formatting
- Testing
- CI baseline

---

# 4. Phase 1 — Authentication, Organizations & RBAC

Implement:

- Organization
- User
- Roles
- Permissions
- User-role assignment
- Login
- Refresh
- Logout
- Password reset
- Account status
- Tenant context

Validate:

```text
User
 ↓
Organization
 ↓
Role
 ↓
Permission
```

Security tests should begin here, not at the end of the project.

---

# 5. Phase 2 — Staff & Departments

Implement:

- Department CRUD
- Staff CRUD
- Employee code
- Designation
- Reporting manager
- Staff status
- User linking
- Staff onboarding/offboarding

Add:

- Staff list
- Search/filter
- Staff profile
- Permission-aware UI

This becomes the operational foundation for attendance, leave, assets, and approvals.

---

# 6. Phase 3 — Student & Guardian Operations

Implement the CampusOps-level student model:

- Student profile
- Student code
- Guardian relationship
- Status
- Basic documents
- Search/filter

If an external School ERP is the source of truth, keep synchronization/import boundaries explicit.

Do not accidentally rebuild a full academic ERP.

---

# 7. Phase 4 — Attendance

Implement:

- Attendance database model
- Check-in
- Check-out
- Admin marking
- Daily view
- Attendance history
- Correction workflow
- Basic finalization
- Audit

Important database note:

`StaffAttendance` is defined in `03-DATABASE-ARCHITECTURE.md` and should be implemented according to that model.

Test:

- Duplicate check-in
- Cross-tenant access
- Unauthorized correction
- Finalized record editing
- Concurrent operations

---

# 8. Phase 5 — Leave

Implement:

- Leave types
- Leave balances
- Leave requests
- Approval integration
- Approve/reject
- Cancellation
- Leave history
- Notifications

Initial leave types:

- Casual Leave
- Sick Leave
- Earned Leave
- Half Day
- Emergency Leave

Implement balance validation transactionally.

---

# 9. Phase 6 — Complaints & Maintenance

Implement:

- Complaint creation
- Categories
- Priority
- Assignment
- Status workflow
- Comments/history
- Maintenance tracking
- Notifications
- Reports

Statuses:

```text
OPEN
ASSIGNED
IN_PROGRESS
COMPLETED
CLOSED
```

Priorities:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 10. Phase 7 — Notices & Circulars

Implement:

- Notice creation
- Audience selection
- Attachments
- Scheduling
- Publishing
- Read status
- Acknowledgement
- Archive

Audiences include:

- Teachers
- Students
- Parents
- Departments
- Entire School

Add notification integration.

---

# 11. Phase 8 — Visitor Management

Implement:

- Visitor registration
- Check-in
- Check-out
- Host
- Purpose
- Mobile
- Organization
- Vehicle number
- Photo
- Visitor pass

Frontend should optimize for reception speed.

The receptionist should be able to complete a normal check-in without navigating through unnecessary screens.

---

# 12. Phase 9 — Assets

Implement:

- Asset categories
- Asset registration
- Asset codes
- QR/barcode
- Location
- Assignment
- Transfer
- Maintenance
- Warranty
- Retirement
- History

Ensure transfer and retirement actions are transactional and audited.

---

# 13. Phase 10 — Documents

Implement:

- Template management
- Template variables
- Template versioning
- PDF generation
- Generated document records
- Protected downloads
- ID cards
- Certificates

Initial templates:

```text
Bonafide Certificate
Character Certificate
Experience Letter
Salary Certificate
Visitor Pass
Employee ID Card
Student ID Card
```

---

# 14. Phase 11 — Approval Workflows

Build the reusable approval engine if not already implemented.

Support:

- Workflow definition
- Multiple steps
- Approver assignment
- Approve/reject
- Comments
- History
- Notifications

Integrate first with:

- Leave
- Purchase/budget requests where applicable
- Asset purchase
- Maintenance approvals

Business modules remain owners of business data.

---

# 15. Phase 12 — Events & Calendar

Implement:

- Event CRUD
- Event types
- Venue
- Participants
- Calendar view
- Reminders
- Archive
- Notifications

Initial event types:

- Sports Day
- PTM
- Holiday
- Examination
- Meeting
- Annual Day

---

# 16. Phase 13 — Fees

Implement only the operational fee capabilities required by the product:

- Fee categories
- Fee structures
- Student assignments
- Payment recording
- Receipts
- Outstanding amounts
- Basic reports

Do not build full accounting in this phase.

If online payments are required later, introduce a payment-provider abstraction and verified webhook processing.

---

# 17. Phase 14 — Transport

Implement:

- Routes
- Stops
- Vehicles
- Driver/staff assignment
- Student route assignment
- Basic transport reports

Defer GPS/live tracking.

---

# 18. Phase 15 — Notifications & Documents Hardening

After core modules exist, improve shared capabilities:

### Notifications

- Templates
- Preferences
- Retry
- Idempotency
- Delivery status
- Provider abstraction

### Documents

- File validation
- Storage abstraction
- Protected download
- Template versions
- Retention rules

This phase prevents each business module from inventing its own notification/file implementation.

---

# 19. Phase 16 — Reports & Dashboards

Build dashboards around actual operational data.

Examples:

### School Admin

- Complaints
- Pending approvals
- Attendance
- Leave
- Visitors
- Assets
- Notices
- Events

### Principal

- Operational overview
- Attendance trends
- Leave
- Complaint status
- Approvals

### Accountant

- Fees
- Outstanding amounts
- Payment summary

### Receptionist

- Visitor activity
- Notices/events relevant to reception

Do not create decorative charts without actionable information.

---

# 20. Phase 17 — Audit & Operational Hardening

Verify audit coverage for:

- Authentication
- Role changes
- Staff changes
- Attendance corrections
- Leave decisions
- Complaint transitions
- Asset transfers/retirement
- Document generation
- Important configuration changes

Add:

- Correlation IDs
- Structured logs
- Error monitoring
- Performance checks

---

# 21. Phase 18 — Security & Production Readiness

Perform a dedicated review:

### Authentication

- Token rotation
- Password reset
- Session invalidation
- Brute-force protection

### Authorization

- Role checks
- Permission checks
- Resource authorization
- Tenant isolation

### Files

- Upload validation
- Protected download
- Storage access

### API

- Rate limits
- Payload limits
- CORS
- Security headers
- Error leakage

### Database

- Backups
- Restore
- Migrations
- Indexes

---

# 22. Phase 19 — Deployment

Initial production topology:

```text
Frontend
   ↓
Backend
   ↓
Managed PostgreSQL
```

Add durable object storage for multi-instance production file handling.

Only add Redis/worker infrastructure when background workload justifies it.

Deployment checklist:

```text
Build
 ↓
Test
 ↓
Migrate
 ↓
Deploy
 ↓
Health Check
 ↓
Smoke Test
```

---

# 23. Phase 20 — End-to-End Acceptance

Before declaring MVP complete, execute real user journeys.

### Admin

```text
Create organization
 → Create department
 → Create staff
 → Assign role
 → Configure leave
 → Review dashboard
```

### Staff

```text
Login
 → Check in
 → Apply leave
 → Check attendance
 → Receive notification
```

### Approver

```text
Login
 → Open pending leave
 → Review
 → Approve
 → Staff notified
```

### Receptionist

```text
Register visitor
 → Check in
 → Generate visitor pass
 → Check out
```

### Asset manager

```text
Register asset
 → Assign
 → Transfer
 → Maintenance
 → Retire
```

### School admin

```text
Publish notice
 → Select audience
 → Attach document
 → Notify
 → Review acknowledgement
```

---

# 24. Testing Pyramid

Use:

```text
          E2E
        /     \
   Integration
      /         \
    Unit Tests
```

Prioritize unit tests for:

- Business rules
- State transitions
- Balance calculations
- Permission decisions

Integration tests for:

- Prisma/database behavior
- Tenant isolation
- Transactions
- API contracts

E2E tests for:

- Login
- Leave
- Attendance
- Visitor
- Complaint
- Asset
- Notice
- Document generation

---

# 25. Definition of Done

A feature is complete when:

- Database schema exists
- Migration is tested
- Backend service exists
- DTO validation exists
- Authorization exists
- Tenant isolation exists
- API contract exists
- Frontend flow exists
- Loading/error/empty states exist
- Audit is implemented where required
- Notifications are integrated where required
- Tests cover important business rules
- Documentation is updated

Avoid marking a module complete after CRUD alone.

---

# 26. Recommended Build Order Summary

```text
Foundation
   ↓
Auth / RBAC / Tenancy
   ↓
Departments / Staff
   ↓
Students / Guardians
   ↓
Attendance
   ↓
Leave + Approvals
   ↓
Complaints / Maintenance
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
Notifications hardening
   ↓
Reports / Dashboards
   ↓
Audit hardening
   ↓
Security
   ↓
Production
```

---

# 27. Future Roadmap

After MVP validation:

### Workforce

- QR attendance
- Mobile attendance
- Biometric integrations
- Advanced shifts

### Finance

- Payment gateway
- Accounting integration
- Purchase orders
- Inventory
- Vendor management

### Transport

- GPS
- Live ETA
- Route optimization
- Driver app

### Maintenance

- Preventive maintenance
- Vendor management
- Service schedules

### Platform

- Mobile apps
- Public APIs
- ERP integrations
- WhatsApp Business API
- AI-assisted workflows

Future features should reuse the existing domain boundaries instead of forcing architectural rewrites.

---

# 28. Delivery Strategy

Prefer small, deployable milestones.

Example:

```text
Milestone 1
Auth + Organization + Users

Milestone 2
Staff + Departments

Milestone 3
Attendance + Leave

Milestone 4
Complaints + Notices

Milestone 5
Visitors + Assets

Milestone 6
Documents + Approvals

Milestone 7
Events + Fees + Transport

Milestone 8
Reports + Security + Production
```

Each milestone should be demonstrable.

---

# 29. Final Principle

The objective is not to build the largest school-management system.

The objective is to build a **secure, maintainable, multi-tenant operational platform that schools can actually use every day**, while keeping the architecture simple enough for a small team to develop and operate.

Build the boring foundations first. Add complexity only when a real workflow requires it.
