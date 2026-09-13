# School Operations Management SaaS
## Domain Architecture

**Document:** `02-DOMAIN-ARCHITECTURE.md`  
**Version:** 1.0  
**Status:** Architecture Baseline  
**Date:** September 2026

---

# 1. Purpose

This document defines the conceptual domain architecture for the School
Operations Management SaaS (CampusOps).

It translates the product scope into clear business domains and module
boundaries before database and implementation design begins.

The source requirements define the core MVP around complaint &
maintenance, leave, visitor management, circular/notice management,
asset management, document generation, approval workflows, and an event
calendar. They also define authentication, user management,
organization management, reports, notifications, and audit logs as
platform/API concerns.

The architecture therefore prioritizes these operational domains rather
than expanding into a full academic School ERP.

---

# 2. Domain Architecture Principles

## 2.1 Operations First

CampusOps is intended to digitize **non-academic school operations**.

The product requirements describe it as a platform that complements an
existing School ERP rather than replacing the academic ERP.

Core domains are:

```text
School Administration
        +
People
        +
Operational Requests
        +
Approvals
        +
Visitors
        +
Communication
        +
Assets
        +
Documents
        +
Events
        +
Reports
```

Academic ERP functionality is outside the initial product boundary.

## 2.2 Multi-Tenant by Design

The top-level business boundary is the school organization.

```text
Platform
   │
   ├── Organization / School A
   │      └── All school-owned data
   │
   ├── Organization / School B
   │      └── All school-owned data
   │
   └── Organization / School C
          └── All school-owned data
```

Every school-owned domain must be tenant-aware.

The requirements explicitly specify independent users, permissions,
storage, and data for each school, with `organization_id` on every table.

## 2.3 Shared Services Should Not Own Business Domains

Cross-cutting capabilities should be reusable services:

- Authentication
- Authorization
- Notifications
- Audit logs
- File storage
- Reporting
- Activity history

Business modules remain responsible for their own business state.

---

# 3. High-Level Domain Map

```text
                         CampusOps Platform
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
       Platform / SaaS                     School Organization
              │                                   │
       ┌──────┴──────┐            ┌───────────────┼───────────────┐
       │             │            │               │               │
  Onboarding     Subscription   People         Operations      Resources
                                │               │               │
                          ┌─────┴─────┐    ┌────┼────┐       ┌────┼────┐
                          │           │    │    │    │       │    │    │
                      Students     Staff  Leave Complaint Visitor Asset
                                             │       │       │      │
                                             └───────┼───────┘      │
                                                     │              │
                                               Approvals            │
                                                     │              │
                              ┌──────────────────────┼──────────────┤
                              │                      │              │
                           Notices                Events        Documents
                              │                      │              │
                              └──────────────┬───────┴──────────────┘
                                             │
                                    Notifications
                                             │
                                      Reports / Audit
```

---

# 4. Domain Classification

## Core Business Domains

1. Student Management
2. Staff Management
3. Complaint & Maintenance
4. Leave Management
5. Visitor Management
6. Notice Management
7. Asset Management
8. Document Management
9. Approval Workflow
10. Event Calendar

## Platform Domains

1. Organization Management
2. User Management
3. Authentication
4. Authorization / RBAC
5. Subscription / SaaS Management

## Cross-Cutting Services

1. Notifications
2. File Storage
3. Audit Logging
4. Activity History
5. Reporting
6. Calendar utilities

## Presentation / Experience

1. Role-based dashboards
2. Search/filtering
3. Dashboard widgets
4. Forms
5. Tables
6. Calendar views

---

# 5. Organization Domain

## Responsibility

The Organization domain represents a school tenant and owns the
configuration boundary for school operations.

## Responsibilities

- School profile
- Organization settings
- Departments
- School configuration
- Operational preferences
- Tenant lifecycle
- Optional branding
- Optional custom subdomain

## Conceptual ownership

```text
Organization
Department
OrganizationSettings
```

## Relationships

```text
Organization
   ├── Users
   ├── Students
   ├── Staff
   ├── Departments
   ├── Complaints
   ├── Leave Requests
   ├── Visitors
   ├── Notices
   ├── Assets
   ├── Documents
   ├── Approvals
   └── Events
```

Organization is the highest-level boundary for school operational data.

---

# 6. User & Identity Domain

The User domain represents authenticated accounts and should remain
separate from business profiles.

```text
User
 ├── Authentication credentials
 ├── Role / permissions
 └── Organization membership

User
 ├── Student Profile (when applicable)
 └── Staff Profile (when applicable)
```

Responsibilities:

- User account
- Login identity
- Account status
- Organization membership
- Role assignment
- Password/security lifecycle

Authentication and authorization details are defined later in
`04-AUTH-RBAC-TENANCY.md`.

---

# 7. Student Domain

The source requirements mention students primarily as a target audience
for notices and as a future/operational user category. The detailed MVP
modules are more heavily focused on employee and school administration
workflows.

Therefore the Student domain should initially remain focused on the
minimum student information required by operational modules.

Potential responsibilities:

- Student profile
- Class/section association where required
- Parent/guardian relationship where required
- Student ID information
- Student documents
- Student-facing notices/events

Academic functionality such as marks, exams, timetables, homework, and
curriculum is outside the current product scope.

---

# 8. Staff Domain

The requirements identify teachers, maintenance staff, receptionists,
accountants, principals, and school administrators as operational users.

The Staff domain represents the business profile of an employee.

Responsibilities may include:

- Staff profile
- Designation
- Department
- Employment information
- Role relationship
- Leave information
- Attendance information where implemented

The Staff domain is used by:

```text
Staff
 ├── Leave
 ├── Complaints
 ├── Approvals
 ├── Notices
 ├── Events
 └── Documents
```

---

# 9. Complaint & Maintenance Domain

This is one of the primary MVP domains.

The source requirements define complaint categories, priorities,
statuses, assignment, comments, image uploads, notifications, reports,
and timeline history.

## Responsibility

Manage operational issues from submission through closure.

## Core Concepts

```text
Complaint
Complaint Category
Complaint Assignment
Complaint Comment
Complaint Attachment
Complaint Status History
```

## Workflow

```text
Create Complaint
       ↓
Open
       ↓
Assign Maintenance Staff
       ↓
In Progress
       ↓
Completed
       ↓
Closed
```

Defined statuses:

```text
OPEN
ASSIGNED
IN_PROGRESS
COMPLETED
CLOSED
```

Priority:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Categories:

```text
Electrical
Plumbing
Furniture
IT
Cleaning
Security
Other
```

## Cross-Domain Dependencies

- Users/Staff for reporter and assignee
- Organization for tenant ownership
- Files for uploaded images
- Notifications for status updates
- Audit/activity for history
- Reports for operational reporting
- Approval Workflow where maintenance action requires approval

---

# 10. Leave Management Domain

The source requirements define leave requests, leave balances,
history, calendar view, approval workflow, reports, and notifications.

## Responsibility

Manage employee leave from request through decision and history.

## Core Concepts

```text
Leave Type
Leave Request
Leave Balance
Leave Approval
Leave History
```

## Workflow

```text
Teacher / Employee
        ↓
Leave Request
        ↓
Principal / Approver
        ↓
Approved / Rejected
        ↓
Leave Balance Updated
        ↓
Calendar Updated
```

Leave types defined by the requirements:

- Casual Leave
- Sick Leave
- Earned Leave
- Half Day
- Emergency Leave

## Cross-Domain Dependencies

- Staff/User
- Approval Workflow
- Notifications
- Calendar
- Reports
- Audit history

Leave should consume the shared Approval Workflow capability rather
than implement an independent approval engine.

---

# 11. Visitor Management Domain

Visitor Management replaces the paper visitor register.

## Responsibility

Manage the visitor lifecycle from arrival through departure.

## Core Concepts

```text
Visitor
Visitor Log / Visit
Visitor Pass
Host
Check-In
Check-Out
```

Visitor information defined by the requirements includes:

- Name
- Mobile
- Organization
- Vehicle number
- Purpose
- Host
- Check-in time
- Check-out time
- Photo

## Workflow

```text
Visitor Arrives
      ↓
Reception Entry
      ↓
Photo Capture
      ↓
Host Notification
      ↓
Visitor Pass
      ↓
Meeting
      ↓
Check-Out
      ↓
Visitor Log Saved
```

The visitor pass may be generated as a document/PDF and may later use
a QR code.

## Cross-Domain Dependencies

- User/Staff for host
- Notifications
- Document Generator
- File Storage
- Audit Logs
- Reports

---

# 12. Notice & Circular Domain

The source requirements call this **Circular & Notice Management**.

## Responsibility

Centralize school operational communication.

## Core Concepts

```text
Notice
Notice Audience
Notice Attachment
Notice Publication
Notice Read/Acknowledgement
```

## Workflow

```text
Create Notice
      ↓
Select Audience
      ↓
Upload Attachment
      ↓
Schedule
      ↓
Publish
      ↓
Read Acknowledgement
      ↓
Archive
```

Target audiences defined by the requirements:

- Teachers
- Students
- Parents
- Departments
- Entire School

## Cross-Domain Dependencies

- Users
- Students
- Departments
- File Storage
- Notifications
- Audit
- Reporting

---

# 13. Asset Management Domain

Asset Management tracks school-owned assets throughout their lifecycle.

## Responsibility

Manage assets from acquisition/registration through assignment,
maintenance, transfer, and retirement.

## Core Concepts

```text
Asset
Asset Category
Asset Assignment
Asset Location
Asset History
Asset Maintenance
Asset Warranty
```

The requirements include:

- QR code
- Barcode
- Asset history
- Maintenance history
- Warranty tracking
- Asset transfer
- Asset retirement

Categories include:

```text
Computers
Laptops
Projectors
Furniture
Science Equipment
Sports Equipment
Library Assets
Vehicles
```

## Workflow

```text
Purchase
   ↓
Add Asset
   ↓
Generate QR / Barcode
   ↓
Assign Location
   ↓
Maintenance History
   ↓
Transfer (if required)
   ↓
Retire
```

## Cross-Domain Dependencies

- Organization / Department
- Staff/User
- Documents
- Complaint & Maintenance
- Approvals
- Reports
- Audit

Future inventory and purchase-order functionality is identified as a
future enhancement rather than an initial requirement.

---

# 14. Document Management Domain

The source requirements distinguish document generation from general
document/file handling.

Therefore the architecture should distinguish:

```text
Document Generation
        +
File Storage
```

## Document Generation

Defined templates:

- Bonafide Certificate
- Character Certificate
- Experience Letter
- Salary Certificate
- Visitor Pass
- Employee ID Card
- Student ID Card

Features:

- Template editor
- Auto-fill fields
- PDF generation
- Print
- Download

## File Storage

Store uploaded/generated files and associate them with the correct
organization and business resource.

The first implementation may use local storage to minimize
infrastructure cost, but file handling should be hidden behind a
storage abstraction so cloud object storage can be introduced later.

---

# 15. Approval Workflow Domain

Approval Workflow is a shared business capability.

The requirements explicitly identify:

- Leave Approval
- Purchase Approval
- Budget Approval
- Asset Purchase
- Maintenance Approval

and:

- Multi-level approvals
- Comments
- Status tracking
- Notifications
- Approval history

## Generic Model

```text
Business Request
       ↓
Approval Workflow
       ↓
Approval Step 1
       ↓
Approval Step 2
       ↓
Approval Step N
       ↓
Approved / Rejected
       ↓
Notification
```

## Ownership Principle

Business modules own their request data.

The Approval domain owns the approval process.

Example:

```text
Leave Management
      │
      └── Leave Request
              │
              ↓
       Approval Workflow
              │
              ↓
       Approved / Rejected
```

Similarly:

```text
Asset Management
      │
      └── Asset Purchase Request
              │
              ↓
       Approval Workflow
```

This prevents each module from inventing its own approval mechanism.

---

# 16. Event Calendar Domain

The Event Calendar manages school events and scheduling.

Defined event types:

- Sports Day
- PTM
- Holiday
- Examination
- Meeting
- Annual Day

Features:

- Event creation
- Venue management
- Calendar view
- Participant invitations
- Reminders
- Event archive

## Workflow

```text
Create Event
      ↓
Assign Venue
      ↓
Invite Audience
      ↓
Schedule Reminder
      ↓
Event
      ↓
Completed
      ↓
Archive
```

The calendar capability may also be consumed by Leave Management.

---

# 17. Notification Domain

Notifications are a cross-cutting capability.

The requirements define:

- Email
- Push notifications
- SMS (optional)
- WhatsApp (optional)

Business modules should not directly depend on a specific provider.

Instead:

```text
Business Domain
      ↓
Notification Service
      ↓
Notification Provider(s)
```

Example:

```text
Leave Approved
      ↓
Notification Service
      ├── In-App
      └── Email
```

Optional future channels can be added without changing business module
logic.

---

# 18. Reporting Domain

Reporting is a cross-cutting read-oriented capability.

The requirements identify reports for:

- Complaints
- Leave
- Visitors
- Assets
- Documents
- Approvals
- Events

Exports:

- PDF
- Excel
- CSV

Reporting should consume data from business domains rather than own
duplicate operational records.

```text
Complaint ──────┐
Leave ──────────┤
Visitor ────────┤
Asset ──────────┼──→ Reporting
Documents ──────┤
Approvals ──────┤
Events ─────────┘
```

---

# 19. Audit & Activity Domain

Audit logging is a cross-cutting platform capability.

Examples:

```text
Complaint created
Complaint assigned
Leave approved
Visitor checked in
Notice published
Asset transferred
Document generated
Approval rejected
Organization setting changed
```

Audit history should capture enough information to understand who
performed an important action, when it occurred, and what resource was
affected.

Business history and security audit are separate concerns.

For example:

```text
Complaint Status History
        ≠
Security Audit Log
```

---

# 20. Dashboard Domain

Dashboard is a presentation-oriented aggregation capability.

The requirements identify:

- Open complaints
- Pending approvals
- Employees on leave
- Visitors today
- Upcoming events
- Recent notices
- Asset alerts

The dashboard reads from underlying domains and does not own business
records.

```text
Complaints ──────┐
Approvals ───────┤
Leave ───────────┤
Visitors ────────┼──→ Dashboard
Events ──────────┤
Notices ─────────┤
Assets ──────────┘
```

---

# 21. SaaS Platform Domain

The platform itself has concerns outside school operations.

These may include:

- SaaS super-admin
- School onboarding
- Subscription management
- Platform configuration
- Platform analytics

The requirements identify a SaaS Super Admin responsible for:

- Managing schools
- Subscription management
- Platform configuration
- Analytics

This platform layer must remain separate from school operational data.

---

# 22. Cross-Domain Dependency Map

```text
                         Organization
                              │
                 ┌────────────┼────────────┐
                 │            │            │
               Users        Staff       Students
                 │            │            │
       ┌─────────┼────────────┼────────────┐
       │         │            │            │
    Leave    Complaints    Visitors      Notices
       │         │            │            │
       └────┬────┴──────┬─────┴────────────┘
            │           │
       Approvals     Notifications
            │           │
            └─────┬─────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
      Assets   Documents   Events
        │         │         │
        └─────────┼─────────┘
                  │
          Reports / Audit
```

---

# 23. Domain Ownership Rules

Each business domain owns its own business state.

| Domain | Primary Ownership |
|---|---|
| Organization | School configuration |
| User | Authentication identity |
| Staff | Employee profile |
| Student | Student operational profile |
| Complaint | Maintenance issue lifecycle |
| Leave | Employee leave lifecycle |
| Visitor | Visitor visit lifecycle |
| Notice | School communication lifecycle |
| Asset | Asset lifecycle |
| Document | Generated document metadata |
| Approval | Approval process state |
| Event | School event lifecycle |
| Notification | Notification delivery/inbox state |
| Audit | Security/action history |
| Report | Reporting/read models |
| Dashboard | Aggregated presentation data |

A module should not directly mutate another domain's internal business
state without going through a defined application/domain boundary.

---

# 24. Shared Workflow Pattern

Several modules share lifecycle concepts:

```text
Create
  ↓
Validate
  ↓
Submit
  ↓
Assign / Approve
  ↓
Process
  ↓
Complete
  ↓
Archive / Close
```

However, not every module should be forced into one generic workflow.

Reusable capabilities should be extracted only where behavior is
genuinely shared.

Good shared capabilities:

- Approval engine
- Notification service
- Audit service
- File storage

Domain-owned behavior:

- Complaint lifecycle
- Leave balance rules
- Asset retirement rules
- Visitor check-out rules

---

# 25. API Module Boundaries

The source requirements list these API modules:

```text
Authentication
User Management
Organization Management
Complaint Management
Leave Management
Visitor Management
Notice Management
Asset Management
Document Generation
Approval Workflow
Calendar
Reports
Notifications
Audit Logs
```

A conceptual NestJS structure is:

```text
apps/api/src/
├── auth/
├── organizations/
├── users/
├── students/
├── staff/
├── complaints/
├── leave/
├── visitors/
├── notices/
├── assets/
├── documents/
├── approvals/
├── events/
├── notifications/
├── reports/
├── audit/
└── common/
```

The exact implementation structure will be finalized in
`05-BACKEND-ARCHITECTURE.md`.

---

# 26. Frontend Domain Boundaries

The frontend should follow the same business boundaries.

```text
apps/web/
├── features/
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
├── components/
├── lib/
└── app/
```

The frontend should not duplicate backend business rules.

---

# 27. Architecture Lessons From the Existing Clinic Application

The existing Clinic reverse-engineering report is useful as an
architectural reference, but it is a healthcare application and should
not be copied as a business model.

Reusable architectural patterns include:

- NestJS modular monolith
- Prisma/PostgreSQL
- DTO validation
- Global authentication guard pattern
- Frontend API client
- React Query
- Role-based dashboard structure
- Email provider abstraction
- Health checks and OpenAPI

The Clinic report also identified weaknesses that should not be repeated,
including manual tenant scoping, insufficient permission granularity,
public file serving, weak WebSocket identity validation, and lack of
strong asynchronous processing.

For CampusOps, these lessons should be applied to school operations
rather than copied as healthcare-specific functionality.

---

# 28. MVP Domain Priority

Based on the source requirements' recommended launch order:

## Phase 1 — Foundation

```text
Authentication
RBAC
Organization
Users
Dashboard
Notifications
```

## Phase 2 — Core Operations

```text
Complaint & Maintenance
Leave
Notice / Circular
```

## Phase 3 — Administration

```text
Visitors
Assets
Document Generation
```

## Phase 4 — Workflow & Planning

```text
Approval Workflow
Event Calendar
Reports
Audit Logs
Subscription / Billing
```

The source requirements explicitly recommend this phased rollout to
deliver value early while keeping development manageable.

---

# 29. What Is Deliberately NOT a Domain Yet

The following should not become first-class MVP domains unless later
requirements justify them:

- Academic ERP
- Examination management
- Timetable management
- Homework
- Curriculum management
- Inventory management
- Vendor management
- Purchase order management
- Preventive maintenance
- AI services
- Mobile applications
- External ERP integrations

The source requirements list several of these as future enhancements,
including mobile apps, QR employee attendance, vendor management,
purchase orders, inventory, preventive maintenance, AI features, ERP
integrations, WhatsApp Business API, and public APIs.

---

# 30. Domain Architecture Summary

```text
                    CAMPUSOPS PLATFORM
                           │
              ┌────────────┴────────────┐
              │                         │
       PLATFORM DOMAIN           SCHOOL DOMAIN
              │                         │
      ┌───────┼───────┐       ┌─────────┼─────────┐
      │       │       │       │         │         │
    Auth    SaaS   Organization  People  Operations Resources
                                  │         │         │
                              ┌───┴───┐ ┌───┼────┐ ┌──┼────┐
                              │       │ │   │    │ │  │    │
                           Student Staff│Leave Complaint│Assets
                                       │ Visitor      │
                                       │ Notice       │
                                       │ Event        │
                                       └───────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                         Approvals      Documents       Notifications
                              │               │               │
                              └───────────────┼───────────────┘
                                              │
                                      Reports / Audit
```

The key architectural decision is:

> **Business domains own business state, while shared services provide
> reusable capabilities.**

This keeps the system modular without prematurely turning it into
microservices.

---

# 31. Next Architecture Document

The next document is:

`03-DATABASE-ARCHITECTURE.md`

It should define the database model from this domain architecture,
including:

- Organizations
- Users
- Roles
- Permissions
- Departments
- Students
- Staff
- Complaints
- Complaint categories
- Complaint assignments/comments/history
- Leave types/requests/balances
- Visitors/visitor logs
- Notices/notice reads
- Assets/categories/history
- Document templates/generated documents
- Approval workflows/steps/requests/logs
- Events/venues/attendees
- Notifications
- Activity logs
- Audit logs
- Tenant ownership
- Foreign keys
- Unique constraints
- Indexes
- Timestamps
- Soft-delete strategy where appropriate
- Audit fields
- MVP vs future entities

The database document should follow this domain architecture rather than
starting from an arbitrary table list.
