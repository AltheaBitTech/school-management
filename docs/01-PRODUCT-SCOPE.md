# School Operations Management SaaS
## Product Scope & MVP Definition

**Document:** `01-PRODUCT-SCOPE.md`  
**Version:** 1.0  
**Status:** Architecture Baseline  
**Date:** September 2026

---

# 1. Purpose

This document defines the product scope for the School Operations Management SaaS platform.

The platform is intended to provide a centralized system for managing day-to-day school operations across students, staff, attendance, leave, complaints, visitors, notices, events, assets, documents, approvals, dashboards, reports, and notifications.

This document establishes:

- What the platform is
- Who will use it
- Core operational domains
- MVP scope
- Major workflows
- What is deferred
- Boundaries for subsequent architecture documents

This document is the baseline for the domain, database, authentication, backend, frontend, workflow, API, security, deployment, and implementation documents.

---

# 2. Product Definition

The School Operations Management SaaS platform is a **multi-tenant school operations platform** designed to centralize administrative and operational activities within a school or educational organization.

The platform brings multiple operational workflows into one system:

```text
Students
   │
   ├── Attendance
   ├── Leave
   ├── Complaints
   ├── Documents
   └── Notices
   │
Staff
   │
   ├── Attendance
   ├── Leave
   └── Approvals
   │
School Operations
   │
   ├── Visitors
   ├── Assets
   ├── Events
   ├── Notices
   └── Documents
   │
Management
   │
   ├── Dashboards
   ├── Reports
   ├── Approvals
   └── Audit / Activity
```

The system is intended to provide a common operational platform rather than a collection of disconnected modules.

---

# 3. Product Goals

The primary goals are:

1. Centralize school operational information.
2. Reduce manual registers and spreadsheet-based processes.
3. Provide role-based access to school users.
4. Support multiple schools/organizations through tenant isolation.
5. Digitize attendance and leave workflows.
6. Digitize complaints and approval workflows.
7. Improve visitor and asset tracking.
8. Centralize notices, events, and documents.
9. Provide management dashboards and operational reports.
10. Provide notifications for important operational events.
11. Maintain activity/audit history.
12. Keep the initial infrastructure and operational cost low.
13. Provide an architecture that can evolve as the product grows.

---

# 4. Target Organizations

The initial platform is intended for schools and educational organizations that need centralized operational management.

Potential target organizations include:

- Individual schools
- Private schools
- School campuses
- Organizations operating multiple schools
- Colleges and universities (programs, semesters, divisions)
- Coaching and training institutes (courses, modules, batches)
- Educational institutions requiring centralized operational workflows

Each tenant picks an institution type (School, College or Institute) at registration. The type drives the labels used throughout the product, such as Class/Program/Course and Section/Division/Batch, without changing the underlying data model.

The architecture should support multiple independent tenants without requiring separate application deployments for every school.

---

# 5. Multi-Tenant Model

Each school or educational organization is represented as an independent tenant.

Conceptually:

```text
CampusOps Platform
│
├── School A
│   ├── Users
│   ├── Students
│   ├── Staff
│   ├── Attendance
│   ├── Leave
│   ├── Complaints
│   └── Assets
│
├── School B
│   ├── Users
│   ├── Students
│   ├── Staff
│   ├── Attendance
│   ├── Leave
│   ├── Complaints
│   └── Assets
│
└── School C
    └── ...
```

Data belonging to one tenant must never be accessible from another tenant.

Tenant isolation is a fundamental security requirement.

---

# 6. Initial User / Role Model

The exact role and permission model will be finalized in:

`04-AUTH-RBAC-TENANCY.md`

The product should support different categories of users involved in school operations.

Expected role categories include:

- Platform administrators
- School administrators
- Management
- Teachers
- Staff
- Students
- Parents/guardians
- Other operational users where required

The final role list and permission matrix must be derived from the detailed requirements and validated during the RBAC design phase.

---

# 7. Core Product Domains

The platform is organized around the following operational domains.

## 7.1 Organization & School Administration

Responsible for:

- School/organization setup
- School profile
- Operational settings
- Users
- Roles
- Permissions
- Organizational configuration

---

## 7.2 Student Management

Responsible for maintaining student information used throughout the platform.

Expected capabilities include:

- Student records
- Student profile information
- Student status
- Class/section association
- Parent/guardian association
- Student-related documents
- Student operational history

Student information should act as a common reference for attendance, leave, complaints, notices, documents, and other relevant workflows.

---

## 7.3 Staff Management

Responsible for school staff information and operational relationships.

Expected capabilities include:

- Staff records
- Staff profiles
- Department/designation information where required
- Attendance
- Leave
- Approval relationships
- Staff-related documents

---

# 8. Attendance Management

Attendance is a core operational workflow.

The system should support attendance management for relevant school users, including students and staff where required by the product requirements.

Potential capabilities include:

- Daily attendance
- Attendance status
- Attendance history
- Class/section-based attendance
- Staff attendance
- Attendance reporting
- Attendance-related notifications

The exact attendance rules and statuses will be defined in the domain and workflow documents.

---

# 9. Leave Management

Leave management should digitize leave requests and approvals.

Core workflow:

```text
User
  ↓
Leave Request
  ↓
Approval / Rejection
  ↓
Status Update
  ↓
Notification
  ↓
Leave History
```

Expected capabilities:

- Leave request
- Leave type
- Leave dates
- Reason
- Approval workflow
- Approval/rejection
- Leave status
- Leave history
- Notifications

Different leave policies may apply to different user categories.

---

# 10. Complaint Management

Complaint management provides a structured way to record, assign, track, and resolve complaints.

Core workflow:

```text
Complaint Submitted
        ↓
Assignment
        ↓
Investigation / Action
        ↓
Status Updates
        ↓
Resolution
        ↓
Closure
```

Expected capabilities:

- Complaint creation
- Complaint categories
- Priority
- Assignment
- Status tracking
- Comments/updates
- Resolution
- Closure
- Complaint history
- Notifications

Access to complaint information must respect the role and tenant.

---

# 11. Visitor Management

Visitor management is intended to digitize visitor entry and tracking.

Expected capabilities include:

- Visitor registration
- Visitor details
- Purpose of visit
- Person/department being visited
- Check-in
- Check-out
- Visitor history
- Visitor status
- Relevant notifications

The exact visitor workflow will be detailed later.

---

# 12. Notice & Communication Management

The platform should allow authorized users to publish notices and operational announcements.

Expected capabilities include:

- Notice creation
- Notice categories
- Target audience
- Publishing
- Expiration
- Notice visibility
- Notice history
- Notifications

Notices may target:

- Students
- Parents/guardians
- Staff
- Teachers
- Specific classes/sections
- Other configured audiences

---

# 13. Event Management

Event management should provide centralized management of school events.

Expected capabilities include:

- Event creation
- Event details
- Date and time
- Location
- Participants/audience
- Event status
- Event visibility
- Event-related notifications

Examples may include:

- School events
- Meetings
- Activities
- Programs
- Other operational events

The detailed event model will be finalized during domain design.

---

# 14. Asset Management

Asset management should provide visibility into school-owned assets.

Expected capabilities include:

- Asset registration
- Asset categories
- Asset identification
- Asset location
- Assignment
- Status
- Maintenance information where required
- Asset history
- Asset reporting

Examples may include:

- Computers
- Furniture
- Equipment
- Classroom assets
- Office equipment

The platform should maintain an auditable history of important asset changes.

---

# 15. Document Management

The platform should provide centralized document handling for relevant
school records.

Potential document categories include:

- Student documents
- Staff documents
- Administrative documents
- Notices
- Certificates
- Operational documents
- Other school records

The first implementation may use local storage to minimize infrastructure
cost, but file handling should be hidden behind a storage abstraction so
that cloud object storage can be introduced later.

Files must be associated with the correct tenant and resource.

---

# 16. Approval & Workflow Management

Several school operations may require approval.

The platform should provide reusable workflow patterns rather than
implementing unrelated approval logic independently inside every module.

Generic workflow:

```text
Request
  ↓
Submitted
  ↓
Pending Approval
  ↓
Approved / Rejected
  ↓
Completed
```

Examples:

- Leave approval
- Complaint-related actions
- Administrative requests
- Other configurable approval workflows

The exact approval requirements will be defined by the individual domains.

---

# 17. Notifications

Notifications should support important operational events.

Initial notification capabilities may include:

## In-App Notifications

Examples:

- Leave request updates
- Complaint updates
- New notices
- Event reminders
- Approval results
- Administrative updates

## Email Notifications

Email may be used for important operational communication.

The notification architecture should be provider-based so additional
channels can be introduced later without redesigning business modules.

The exact external provider and notification event matrix will be
defined in the notification architecture document.

---

# 18. Dashboards

Dashboards should be role-aware and focused on useful operational
information.

## School Management

Potential information:

- Student counts
- Staff counts
- Attendance overview
- Pending leave requests
- Open complaints
- Visitor activity
- Upcoming events
- Asset information
- Recent notices

## Teachers / Staff

Potential information:

- Relevant attendance
- Pending leave
- Assigned complaints/tasks
- Notices
- Upcoming events

## Students / Parents

Potential information:

- Attendance
- Leave status
- Notices
- Events
- Relevant requests

The final dashboard metrics should be based on actual requirements and
implemented after the underlying modules are stable.

---

# 19. Reporting

The initial reporting scope should focus on operational reports.

Potential reports include:

- Student reports
- Staff reports
- Attendance reports
- Leave reports
- Complaint reports
- Visitor reports
- Event reports
- Asset reports
- Notice/activity reports

Where required, reports may support export formats such as:

- PDF
- CSV
- Excel

Advanced analytics and business intelligence are deferred until there
is a demonstrated requirement.

---

# 20. Activity & Audit

The platform should distinguish between operational activity and
security/audit history.

## Operational Activity

Examples:

```text
Leave request submitted
Complaint created
Visitor checked in
Notice published
Event created
Asset assigned
```

## Audit History

Examples:

```text
User A created a student record
User B changed a student's information
User C approved a leave request
User D modified an asset
User E changed organization settings
```

Audit logging should capture sufficient information to understand who
performed an important action, when it occurred, and what resource was
affected.

The detailed audit design will be defined separately.

---

# 21. SaaS Platform Scope

The product has two conceptual layers.

## Platform Layer

Responsible for Arogyix/CampusOps SaaS operations:

- Tenant onboarding
- Platform administration
- Subscription management where required
- Platform-level configuration
- Tenant lifecycle

## School Operations Layer

Responsible for the actual school's daily operations:

- Students
- Staff
- Attendance
- Leave
- Complaints
- Visitors
- Notices
- Events
- Assets
- Documents
- Approvals
- Reports

These concerns should remain logically separated even when implemented
within the same application.

---

# 22. MVP Scope

The initial MVP should focus on the operational modules described in the
requirements.

## Foundation

- Multi-tenancy
- Authentication
- User management
- Roles
- Permissions
- School configuration
- Audit/activity history

## People

- Students
- Staff
- Parent/guardian relationships where required

## Operations

- Student attendance
- Staff attendance where required
- Leave management
- Complaint management
- Visitor management

## Communication

- Notices
- Events
- In-app notifications
- Email notifications where required

## Resources

- Assets
- Documents/files

## Management

- Approvals
- Dashboards
- Operational reports

The precise MVP boundary should be validated against the detailed
requirements before implementation begins.

---

# 23. Explicitly Deferred / Future Expansion

Features not required for the first operational MVP should be treated as
future scope unless the requirements explicitly make them mandatory.

Potential future areas include:

- Advanced analytics / BI
- Mobile applications
- Push notifications
- Additional messaging channels
- Advanced workflow automation
- External integrations
- Advanced asset maintenance
- Advanced document workflows
- Multi-campus advanced management
- Additional education-specific modules
- AI-assisted operational features

Infrastructure should similarly be introduced based on actual need rather
than prematurely.

---

# 24. Cost-Conscious Architecture Principle

The platform should be designed around a low initial infrastructure cost.

The principle is:

> **Keep infrastructure inexpensive without compromising architecture or security.**

The initial system should prefer a simple architecture such as:

```text
Next.js
   ↓
NestJS Modular Monolith
   ↓
PostgreSQL + Prisma
```

with external infrastructure introduced only where justified.

Potential future infrastructure upgrades may include:

```text
Redis / Queue
Cloud Object Storage
Background Workers
Advanced Monitoring
Additional Notification Providers
```

The application should use clear abstractions around infrastructure that
may change later.

For example:

```text
FileStorageService
      ↓
LocalStorageProvider
      ↓
Future: R2StorageProvider / S3StorageProvider
```

and:

```text
NotificationService
      ↓
EmailProvider
      ↓
Future: Additional Providers
```

---

# 25. Architecture Principles

The product architecture should follow these principles:

## 25.1 Multi-Tenant by Design

Tenant isolation must be enforced at the backend and data-access layers.

## 25.2 Backend as the Security Boundary

Frontend permissions are for user experience. The backend remains the
source of truth for authorization.

## 25.3 Modular Monolith First

The first implementation should use clear domain modules inside one
backend application.

Microservices should not be introduced without a concrete requirement.

## 25.4 Reusable Workflows

Common patterns such as approvals, notifications, documents, and audit
logging should be reusable across domains.

## 25.5 Infrastructure Abstraction

Storage, notifications, and future background processing should have
clear boundaries so providers can be changed later.

## 25.6 Security Before Convenience

Tenant isolation, authorization, validation, secure file access, and
auditability are baseline requirements.

---

# 26. Product Boundary

The platform is primarily responsible for:

```text
School Operations
      +
People Management
      +
Attendance
      +
Leave
      +
Complaints
      +
Visitors
      +
Notices
      +
Events
      +
Assets
      +
Documents
      +
Approvals
      +
Notifications
      +
Dashboards / Reports
```

The platform should not become an unrestricted collection of every
possible education feature.

New modules should be added only when they solve a clearly defined
school operational requirement.

---

# 27. Success Criteria for MVP

The MVP should allow a school to perform the core operational workflows
without relying on disconnected spreadsheets or manual tracking.

Examples:

### Leave

```text
User
 ↓
Leave Request
 ↓
Approval
 ↓
Decision
 ↓
Notification
 ↓
History
```

### Complaint

```text
Complaint
 ↓
Assignment
 ↓
Action
 ↓
Resolution
 ↓
Closure
```

### Visitor

```text
Visitor Registration
 ↓
Check-in
 ↓
Visit
 ↓
Check-out
 ↓
History
```

### Notice

```text
Create Notice
 ↓
Select Audience
 ↓
Publish
 ↓
Notify
 ↓
View / History
```

### Asset

```text
Register Asset
 ↓
Assign
 ↓
Track
 ↓
Update / Maintain
 ↓
History
```

These workflows should be secure, tenant-isolated, auditable, and easy
for the intended users to operate.

---

# 28. Next Architecture Document

The next document is:

`02-DOMAIN-ARCHITECTURE.md`

It will define:

- Domain boundaries
- Module responsibilities
- Core entities at a conceptual level
- Relationships between domains
- Cross-domain workflows
- Shared platform services
- Tenant ownership
- Reusable workflow patterns
- Which concerns belong to the platform layer
- Which concerns belong to school operations

The database architecture should be created **after** the domain
architecture is finalized.
