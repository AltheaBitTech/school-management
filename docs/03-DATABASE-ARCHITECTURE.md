# CampusOps — Database Architecture

## 1. Purpose

This document defines the PostgreSQL + Prisma database architecture for CampusOps.

The database must support:

- Multi-tenancy
- Strong organization isolation
- Authentication and RBAC
- Students and guardians
- Staff and departments
- Staff attendance
- Leave management
- Complaints and maintenance
- Visitors
- Notices/circulars
- Assets
- Documents and files
- Reusable approval workflows
- Events
- Fees
- Transport
- Notifications
- Audit and activity history
- Reporting/dashboard queries

CampusOps should use **one PostgreSQL database with logical tenant isolation** for the initial architecture.

---

# 2. Database Principles

1. PostgreSQL is the primary relational datastore.
2. Prisma is the application ORM/data-access layer.
3. One database serves multiple school organizations.
4. Every tenant-owned entity must be organization-scoped.
5. The backend derives organization context from authenticated identity.
6. Client-supplied `organizationId` must never be treated as sufficient authorization.
7. Business state belongs to its owning module.
8. Shared infrastructure entities provide reusable capabilities.
9. Historical operational records should normally be preserved rather than hard-deleted.
10. Transactions are required for important multi-record state changes.
11. Indexes should reflect actual query patterns.
12. Database constraints should enforce invariants wherever practical.

---

# 3. High-Level Architecture

```text
                         PostgreSQL
                              |
        ------------------------------------------------
        |              |              |               |
   Identity/RBAC   Organization   Operational     Shared
                                   Domains         Services
        |              |              |               |
      User          School       Students         Files
      Role          Settings     Staff            Notifications
      Permission                 Attendance        Approvals
      UserRole                   Leave             Audit
                                Complaints          Activity
                                Visitors
                                Notices
                                Assets
                                Documents
                                Events
                                Fees
                                Transport
```

The schema should remain modular even though all modules share the same PostgreSQL database.

---

# 4. Organization / Tenant Model

`Organization` is the root tenant entity.

Conceptually:

```text
Organization
 ├── Users / memberships
 ├── Departments
 ├── Students
 ├── Staff
 ├── Attendance
 ├── Leave
 ├── Complaints
 ├── Visitors
 ├── Notices
 ├── Assets
 ├── Documents
 ├── Approvals
 ├── Events
 ├── Fees
 ├── Transport
 ├── Notifications
 ├── Audit Logs
 └── Activity Logs
```

Every tenant-owned record must be traceable to exactly one organization.

---

# 5. Organization Entities

## Organization

Typical fields:

```text
id
name
code
status
createdAt
updatedAt
```

Potential status:

```text
ACTIVE
SUSPENDED
ARCHIVED
```

Organization `code` should be unique globally if used as a tenant identifier.

---

## OrganizationSettings

Contains organization-specific configuration such as:

- Timezone
- Locale
- Date format
- Attendance policy
- Leave configuration
- Notification defaults
- Document settings
- Operational preferences

Settings should be separated from the core organization record so the root entity does not become a large configuration table.

---

# 6. Common Entity Conventions

Most business entities should contain:

```text
id
organizationId
createdAt
updatedAt
```

Where appropriate:

```text
deletedAt
```

can support soft deletion.

Not every entity needs soft deletion. Historical records such as audit events should generally be immutable rather than soft-deleted.

---

# 7. Primary Keys & Codes

Use UUIDs for primary keys.

Example:

```text
id = UUID
```

Human-readable operational identifiers may also exist:

```text
EMP-000123
STU-000456
CMP-2026-0012
AST-000321
VIS-2026-0045
REC-2026-0088
```

Human-readable codes should have appropriate organization-scoped unique constraints.

Do not use predictable business codes as the only authorization mechanism.

---

# 8. Identity & RBAC

## User

Represents an authenticated application identity.

Conceptual fields:

```text
id
organizationId
email
passwordHash
status
emailVerifiedAt
lastLoginAt
createdAt
updatedAt
```

A platform-level account may require a different tenancy relationship depending on the final SaaS administration design.

---

## Role

Represents a reusable application role.

Examples:

```text
School Admin
Principal
Teacher
Maintenance Staff
Receptionist
Accountant
```

Organization-scoped roles use:

```text
UNIQUE(organizationId, code)
```

Platform-scoped roles (for example `SAAS_SUPER_ADMIN`) may use `organizationId = NULL`.

PostgreSQL treats `NULL` as distinct in composite unique constraints, so `(NULL, code)` is **not** fully enforced by `UNIQUE(organizationId, code)` alone.

CampusOps therefore uses an additional database constraint for platform roles:

```sql
CREATE UNIQUE INDEX "Role_platform_code_key"
  ON "Role"("code")
  WHERE "organizationId" IS NULL;
```

This partial unique index is **intentional** and is maintained in migration SQL because Prisma schema cannot express filtered/partial unique indexes directly.

See `apps/api/prisma/MIGRATION-NOTES.md` before creating or reviewing migrations that touch `Role`.

---

## Permission

Represents an atomic capability.

Examples:

```text
staff.view
staff.update
attendance.mark
leave.approve
asset.transfer
report.attendance
audit.view
```

---

## RolePermission

Many-to-many relationship:

```text
Role
  ↕
RolePermission
  ↕
Permission
```

---

## UserRole

Associates users with roles.

```text
User
  ↕
UserRole
  ↕
Role
```

Tenant validation is required whenever roles are assigned.

---

# 9. Department

A department groups staff operationally.

Examples:

- Administration
- Teaching
- Accounts
- Maintenance
- Transport
- Security
- IT

Conceptual fields:

```text
id
organizationId
name
code
status
createdAt
updatedAt
```

Recommended constraint:

```text
UNIQUE(organizationId, code)
```

---

# 10. Student Domain

## Student

Conceptual fields:

```text
id
organizationId
studentCode
firstName
lastName
displayName
dateOfBirth
status
photoFileId
createdAt
updatedAt
```

The model intentionally does not attempt to represent the complete academic ERP domain.

---

## ParentGuardian

Represents a guardian/contact.

Potential fields:

```text
id
organizationId
name
mobile
email
relationship
createdAt
updatedAt
```

---

## StudentGuardian

Join entity:

```text
Student
   ↕
StudentGuardian
   ↕
ParentGuardian
```

May contain:

```text
isPrimary
relationship
canReceiveNotifications
```

---

# 11. Staff Domain

## Staff

Represents the employee/business entity.

Conceptual fields:

```text
id
organizationId
employeeCode
userId (optional)
firstName
lastName
displayName
mobile
email
departmentId
designation
joiningDate
lastWorkingDate
reportingManagerId (nullable self-reference)
employmentStatus
photoFileId
createdAt
updatedAt
```

Recommended constraint:

```text
UNIQUE(organizationId, employeeCode)
```

A staff record should normally be retained after offboarding so historical attendance, leave, asset, complaint, and approval references remain valid.

---

# 12. Staff Attendance

## StaffAttendance

This entity is explicitly required by the staff attendance workflow.

Conceptual fields:

```text
id
organizationId
staffId
attendanceDate
checkInAt
checkOutAt
status
lateFlag
earlyDepartureFlag
remarks
correctionRequestedAt
correctedByUserId
correctedAt
createdAt
updatedAt
```

Suggested status:

```text
PRESENT
ABSENT
HALF_DAY
ON_LEAVE
HOLIDAY
WEEK_OFF
```

The exact status set can evolve with policy requirements.

### Core uniqueness

For the initial one-record-per-staff-per-day model:

```text
UNIQUE(organizationId, staffId, attendanceDate)
```

If future requirements introduce multiple shifts/sessions per day, this model may evolve to include a session/shift identifier.

### Important rule

Attendance identity must be derived from authenticated context for self-service operations.

The frontend must not be able to select an arbitrary staff member and create attendance for that person without authorization.

---

# 13. Leave Domain

## LeaveType

Conceptual fields:

```text
id
organizationId
name
code
description
tracksBalance
allowsHalfDay
requiresReason
requiresAttachment
active
createdAt
updatedAt
```

Initial examples:

```text
CASUAL
SICK
EARNED
HALF_DAY
EMERGENCY
```

The database should remain configurable rather than relying exclusively on hard-coded enum values.

---

## LeaveBalance

Conceptual fields:

```text
id
organizationId
staffId
leaveTypeId
periodStart
periodEnd
openingBalance
allocatedAmount
usedAmount
pendingAmount
adjustmentAmount
createdAt
updatedAt
```

A derived available amount can be calculated from the balance components.

A suitable organization-scoped uniqueness rule is:

```text
UNIQUE(
  organizationId,
  staffId,
  leaveTypeId,
  periodStart,
  periodEnd
)
```

---

## LeaveRequest

Conceptual fields:

```text
id
organizationId
staffId
leaveTypeId
startDate
endDate
duration
halfDayPart
reason
attachmentFileId
status
submittedAt
decidedAt
createdAt
updatedAt
```

Potential statuses:

```text
DRAFT
SUBMITTED
PENDING_APPROVAL
APPROVED
REJECTED
CANCELLED
```

State transitions must be enforced by application business logic.

---

# 14. Complaint & Maintenance Domain

## Complaint

```text
id
organizationId
complaintCode
title
description
category
priority
status
createdByUserId
assignedToStaffId
location
createdAt
updatedAt
closedAt
```

Categories:

```text
ELECTRICAL
PLUMBING
FURNITURE
IT
CLEANING
SECURITY
OTHER
```

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

## ComplaintHistory

Stores operational state/history changes.

Conceptually:

```text
id
organizationId
complaintId
actorUserId
oldStatus
newStatus
comment
createdAt
```

Business history is different from the security audit log.

---

## ComplaintAttachment

References uploaded files associated with complaints.

Store metadata/reference, not arbitrary filesystem assumptions.

---

# 15. Visitor Domain

## Visitor

Stores reusable visitor information where appropriate.

Potential fields:

```text
id
organizationId
name
mobile
organizationName
photoFileId
createdAt
updatedAt
```

## Visit

Represents an actual visit.

```text
id
organizationId
visitorId
hostStaffId
purpose
vehicleNumber
checkInAt
checkOutAt
status
photoFileId
createdAt
updatedAt
```

This separation allows one visitor to have multiple historical visits.

---

# 16. Notice / Circular Domain

## Notice

```text
id
organizationId
title
content
status
scheduledAt
publishedAt
createdByUserId
archivedAt
createdAt
updatedAt
```

Possible statuses:

```text
DRAFT
SCHEDULED
PUBLISHED
ARCHIVED
```

---

## NoticeAudience

Stores target audience information.

Targets may include:

```text
TEACHERS
STUDENTS
PARENTS
DEPARTMENTS
ENTIRE_SCHOOL
```

Depending on the final design, department/student-group targeting may use separate relation tables instead of storing only an enum.

---

## NoticeAttachment

References files attached to a notice.

---

## NoticeRead / NoticeAcknowledgement

Stores recipient interaction.

Conceptually:

```text
noticeId
userId
readAt
acknowledgedAt
```

Tenant validation remains mandatory.

---

# 17. Asset Domain

## AssetCategory

Examples:

```text
COMPUTERS
LAPTOPS
PROJECTORS
FURNITURE
SCIENCE_EQUIPMENT
SPORTS_EQUIPMENT
LIBRARY_ASSETS
VEHICLES
```

---

## Asset

Conceptual fields:

```text
id
organizationId
assetCode
name
categoryId
serialNumber
qrCodeValue
purchaseDate
purchaseAmount
warrantyStartDate
warrantyEndDate
location
status
condition
description
createdAt
updatedAt
```

Recommended:

```text
UNIQUE(organizationId, assetCode)
```

QR values should identify the asset without embedding sensitive data.

---

## AssetAssignment / AssetTransfer

Tracks assignment changes.

Conceptually:

```text
id
organizationId
assetId
fromStaffId
toStaffId
fromDepartmentId
toDepartmentId
fromLocation
toLocation
reason
transferredByUserId
transferredAt
```

The exact design may separate current assignment from immutable transfer history.

---

## AssetMaintenance

Tracks service/maintenance events.

```text
id
organizationId
assetId
issue
maintenanceType
vendor
startDate
endDate
cost
status
remarks
createdAt
updatedAt
```

---

## AssetHistory

Operational lifecycle history:

```text
id
organizationId
assetId
action
actorUserId
metadata
createdAt
```

Retirement should preserve history rather than delete the asset.

---

# 18. Document & File Domain

## File

Represents stored-file metadata.

Conceptually:

```text
id
organizationId
storageKey
originalName
mimeType
size
provider
uploadedByUserId
createdAt
```

Do not store a public URL as the authorization model.

---

## DocumentTemplate

```text
id
organizationId
name
type
content
version
active
createdAt
updatedAt
```

Template types include:

```text
BONAFIDE_CERTIFICATE
CHARACTER_CERTIFICATE
EXPERIENCE_LETTER
SALARY_CERTIFICATE
VISITOR_PASS
EMPLOYEE_ID_CARD
STUDENT_ID_CARD
```

---

## GeneratedDocument

```text
id
organizationId
templateId
templateVersion
ownerType
ownerId
fileId
status
generatedByUserId
createdAt
```

The template version should be stored so a historical document can be traced to the exact template used.

---

# 19. Approval Workflow Domain

Approval is a reusable platform capability.

## ApprovalWorkflow

Defines a workflow.

```text
id
organizationId
name
entityType
active
createdAt
updatedAt
```

---

## ApprovalStep

Defines ordered levels.

```text
id
workflowId
stepOrder
approverType
approverReference
createdAt
updatedAt
```

---

## ApprovalRequest

Represents an actual workflow execution.

```text
id
organizationId
workflowId
entityType
entityId
status
currentStep
requestedByUserId
createdAt
updatedAt
completedAt
```

---

## ApprovalAction

Stores decisions:

```text
id
organizationId
approvalRequestId
stepId
actorUserId
action
comment
createdAt
```

Business modules remain owners of the underlying request data.

Example:

```text
LeaveRequest
    ↓
ApprovalRequest
    ↓
ApprovalStep
    ↓
ApprovalAction
```

---

# 20. Event Domain

## Venue

```text
id
organizationId
name
location
capacity
active
```

## Event

```text
id
organizationId
title
type
description
startAt
endAt
venueId
status
createdByUserId
createdAt
updatedAt
```

Event types may include:

```text
SPORTS_DAY
PTM
HOLIDAY
EXAMINATION
MEETING
ANNUAL_DAY
```

## EventParticipant

```text
id
organizationId
eventId
participantType
participantId
status
```

The exact participant model can evolve depending on whether users, students, guardians, or groups are supported.

---

# 21. Fees Domain

CampusOps should initially support operational fee tracking rather than a full accounting ledger.

## FeeStructure

```text
id
organizationId
name
description
periodStart
periodEnd
active
createdAt
updatedAt
```

## FeeComponent

```text
id
organizationId
feeStructureId
name
code
amount
dueDate
```

## StudentFeeAssignment

```text
id
organizationId
studentId
feeComponentId
amountDue
discountAmount
waiverAmount
status
createdAt
updatedAt
```

## FeePayment

```text
id
organizationId
studentId
feeAssignmentId
amount
paymentMethod
reference
status
paidAt
createdAt
updatedAt
```

## FeeReceipt

```text
id
organizationId
receiptNumber
paymentId
fileId
issuedAt
```

Recommended:

```text
UNIQUE(organizationId, receiptNumber)
```

Financial corrections should be handled through explicit adjustment/refund mechanisms rather than destructive edits.

---

# 22. Transport Domain

## TransportRoute

```text
id
organizationId
name
code
active
```

## TransportStop

```text
id
organizationId
routeId
name
description
sequence
pickupTime
dropTime
active
```

Recommended:

```text
UNIQUE(routeId, sequence)
```

## Vehicle

```text
id
organizationId
registrationNumber
vehicleType
capacity
driverStaffId
active
```

Registration numbers should have appropriate organization/global uniqueness based on the final business requirement.

## StudentTransportAssignment

```text
id
organizationId
studentId
routeId
stopId
vehicleId
effectiveFrom
effectiveTo
active
```

Historical assignments should be preserved.

---

# 23. Notification Domain

## Notification

```text
id
organizationId
recipientUserId
type
channel
title
body
status
readAt
sentAt
createdAt
```

Possible status:

```text
PENDING
PROCESSING
SENT
FAILED
```

---

## NotificationDelivery

Optional provider/delivery record:

```text
id
organizationId
notificationId
provider
providerMessageId
status
attemptCount
lastAttemptAt
failureReason
createdAt
updatedAt
```

This keeps provider delivery information separate from the user-facing notification.

---

# 24. Audit & Activity Domain

## AuditLog

```text
id
organizationId
actorUserId
action
entityType
entityId
requestId
before
after
metadata
createdAt
```

Audit logs should be treated as append-oriented/immutable.

Do not store:

- Passwords
- Tokens
- API secrets
- Unnecessary sensitive personal data

---

## ActivityLog

Can represent user-facing operational history.

```text
id
organizationId
actorUserId
entityType
entityId
action
description
metadata
createdAt
```

Audit and activity should retain distinct semantics.

---

# 25. Core Relationship Map

```text
Organization
│
├── User
│   ├── UserRole ── Role ── RolePermission ── Permission
│   └── Notifications
│
├── Department
│   └── Staff
│       ├── StaffAttendance
│       ├── LeaveBalance
│       ├── LeaveRequest
│       ├── AssetAssignment
│       └── Complaints
│
├── Student
│   ├── StudentGuardian ── ParentGuardian
│   ├── StudentFeeAssignment
│   └── StudentTransportAssignment
│
├── Complaints
│   ├── ComplaintHistory
│   └── ComplaintAttachment ── File
│
├── Visitors
│   ├── Visitor
│   └── Visit
│
├── Notices
│   ├── NoticeAudience
│   ├── NoticeAttachment ── File
│   └── NoticeRead/Acknowledgement
│
├── Assets
│   ├── AssetCategory
│   ├── AssetAssignment/Transfer
│   ├── AssetMaintenance
│   └── AssetHistory
│
├── Documents
│   ├── DocumentTemplate
│   ├── GeneratedDocument
│   └── File
│
├── Approvals
│   ├── ApprovalWorkflow
│   ├── ApprovalStep
│   ├── ApprovalRequest
│   └── ApprovalAction
│
├── Events
│   ├── Venue
│   └── EventParticipant
│
├── Fees
│   ├── FeeStructure
│   ├── FeeComponent
│   ├── StudentFeeAssignment
│   ├── FeePayment
│   └── FeeReceipt
│
├── Transport
│   ├── TransportRoute
│   ├── TransportStop
│   ├── Vehicle
│   └── StudentTransportAssignment
│
├── NotificationDelivery
├── AuditLog
└── ActivityLog
```

---

# 26. Tenant-Scoped Constraints

For human-readable identifiers, prefer:

```text
UNIQUE(organizationId, employeeCode)
UNIQUE(organizationId, studentCode)
UNIQUE(organizationId, assetCode)
UNIQUE(organizationId, receiptNumber)
```

Global uniqueness should only be used when the identifier genuinely needs to be globally unique.

This avoids unnecessary coupling between tenants.

---

# 27. Indexing Strategy

Indexes should support common access paths.

Important examples:

### Organization

```text
Organization.code
```

### Users

```text
(organizationId, email)
(organizationId, status)
```

### Staff

```text
(organizationId, employeeCode)
(organizationId, departmentId)
(organizationId, employmentStatus)
(organizationId, reportingManagerId)
```

### Attendance

```text
(organizationId, staffId, attendanceDate)
(organizationId, attendanceDate)
(organizationId, status, attendanceDate)
```

### Leave

```text
(organizationId, staffId, status)
(organizationId, startDate, endDate)
(organizationId, status, createdAt)
```

### Complaints

```text
(organizationId, status)
(organizationId, priority)
(organizationId, assignedToStaffId)
(organizationId, createdAt)
```

### Visitors

```text
(organizationId, checkInAt)
(organizationId, status)
```

### Assets

```text
(organizationId, assetCode)
(organizationId, categoryId)
(organizationId, status)
```

### Notifications

```text
(organizationId, recipientUserId, status)
(organizationId, recipientUserId, readAt)
```

### Audit

```text
(organizationId, createdAt)
(organizationId, actorUserId, createdAt)
(organizationId, entityType, entityId)
```

Do not create indexes for every column. Validate query plans with real workloads.

---

# 28. Foreign Key & Delete Behavior

Use foreign keys to preserve relational integrity.

General approach:

### Historical records

Prefer:

```text
RESTRICT
```

or preserve the referenced record.

### Optional references

Use nullable relationships when the referenced entity can legitimately disappear from active use.

### Example

A staff member should generally not be physically deleted while historical attendance exists.

Instead:

```text
Staff.employmentStatus = OFFBOARDED
```

This preserves historical relationships.

---

# 29. Soft Delete

Soft deletion is useful for active master data where recovery/history matters.

Examples:

- Department
- Notice
- Asset
- Staff
- Configuration

However, do not blindly add `deletedAt` to every table.

For immutable history:

- Audit logs should not be normal soft-deleted records.
- Attendance history should generally remain.
- Leave decisions should remain.
- Financial records should remain according to retention policy.

---

# 30. Transactions

Use transactions when multiple changes must succeed together.

Examples:

### Leave approval

```text
Validate request
      ↓
Validate balance
      ↓
Update leave state/balance
      ↓
Record approval action
      ↓
Create notification intent
      ↓
Commit
```

### Asset transfer

```text
Validate current assignment
      ↓
Create transfer history
      ↓
Update current assignment
      ↓
Audit
      ↓
Commit
```

### Fee payment

```text
Verify payment
      ↓
Create payment
      ↓
Update assignment/payment state
      ↓
Create receipt
      ↓
Audit
      ↓
Commit
```

---

# 31. Concurrency

Important concurrent operations include:

- Leave balance consumption
- Attendance check-in/out
- Asset transfer
- Fee payment
- Approval actions

The application must prevent duplicate or contradictory state transitions.

Use:

- Database transactions
- Unique constraints
- Appropriate isolation/locking
- State validation

Do not rely only on frontend disabling buttons.

---

# 32. File References

Business records should reference files through `File`.

Example:

```text
LeaveRequest
    ↓
attachmentFileId
    ↓
File
```

or:

```text
GeneratedDocument
    ↓
fileId
    ↓
File
```

The file record should identify storage metadata, while authorization determines whether the requesting user may access it.

---

# 33. Reporting & Query Architecture

Reports should query domain data through controlled application services.

Avoid building an uncontrolled generic SQL/report endpoint.

Common reporting dimensions:

- Organization
- Date range
- Department
- Staff
- Student
- Status
- Category
- Priority

For expensive reports:

```text
API
 ↓
Report Service
 ↓
Query
 ↓
Export
```

Large exports can later move to background workers.

---

# 34. Prisma Guidance

Keep Prisma schema organized by domain conceptually even though Prisma may use one schema file.

Recommended application layering:

```text
Controller
   ↓
Application Service
   ↓
Domain/Business Logic
   ↓
Prisma / Repository
   ↓
PostgreSQL
```

Do not allow controllers to contain complex Prisma queries and business rules.

Use transactions for multi-step operations.

---

# 35. Tenant-Scoped Data Access

A safe repository/service pattern should make organization scoping difficult to forget.

Conceptually:

```text
findStaff({
  organizationId,
  staffId
})
```

rather than:

```text
findStaff(staffId)
```

The actual implementation can use repository helpers, Prisma extensions, service-level query builders, or another consistent approach.

The important requirement is that tenant scoping is systematic and testable.

---

# 36. Security Constraints

Database design must support:

- Tenant isolation
- Resource-level authorization
- Historical integrity
- Auditability
- Least-privilege data access

Do not rely on UUIDs to provide security.

UUIDs make enumeration harder, but authorization remains mandatory.

---

# 37. Migration Strategy

Prisma migrations should be:

- Version controlled
- Reviewed
- Tested locally
- Tested against staging
- Applied deliberately to production

For destructive schema changes:

```text
Backup
 ↓
Migration
 ↓
Validation
 ↓
Deploy
```

Prefer additive/backward-compatible migrations when possible.

### Manual SQL constraints

Some PostgreSQL constraints are required by the architecture but cannot be declared in `schema.prisma`.

Current example:

```text
Role platform-role code uniqueness
  → Role_platform_code_key
  → partial unique index on Role(code) WHERE organizationId IS NULL
```

Rules:

1. Keep the constraint in version-controlled migration SQL.
2. Document it in `apps/api/prisma/MIGRATION-NOTES.md`.
3. Review every generated migration before apply.
4. Do **not** allow a generated migration to drop `Role_platform_code_key` unless the architecture deliberately changes.
5. Do not use `prisma db pull` as the source of truth for these constraints.

Prisma may report schema/database drift for manual constraints. That is expected until Prisma adds partial-index support.

---

# 38. MVP Database Priority

### Foundation

- Organization
- OrganizationSettings
- User
- Role
- Permission
- RolePermission
- UserRole

### Operations

- Department
- Staff
- Student
- ParentGuardian
- StudentGuardian
- StaffAttendance
- LeaveType
- LeaveBalance
- LeaveRequest

### Core workflows

- Complaint
- ComplaintHistory
- Visitor/Visit
- Notice
- NoticeAudience
- Asset
- AssetHistory
- DocumentTemplate
- GeneratedDocument
- File
- Approval entities
- Event entities

### Platform

- Notification
- AuditLog
- ActivityLog

### Later/optional

- Fees
- Transport
- Payment provider data
- GPS/device integration
- Inventory/procurement
- Advanced scheduling

---

# 39. Database Review Checklist

Before implementation is considered stable:

- [ ] Every tenant-owned table has organization scope.
- [ ] Tenant-scoped unique constraints are defined.
- [ ] StaffAttendance is explicitly modeled.
- [ ] Leave balance concurrency is handled.
- [ ] Historical staff data is preserved.
- [ ] Approval relationships are clear.
- [ ] Files are metadata references, not public URLs.
- [ ] Audit is separate from activity.
- [ ] Foreign-key behavior is deliberate.
- [ ] Indexes cover common filters.
- [ ] Large report queries are considered.
- [ ] Transactions cover important state changes.
- [ ] Prisma migrations are version controlled.
- [ ] Cross-tenant tests exist.

---

# 40. Final Architecture Position

CampusOps should use a **single PostgreSQL database with a modular relational schema and strict logical tenant isolation**.

The most important invariant is:

```text
Every tenant-owned operation
        ↓
Authenticated organization
        ↓
Authorized resource
        ↓
Tenant-scoped database query
```

The schema should be rich enough to support the required school operations, but not so complicated that the initial product becomes difficult to build or operate.

In particular:

> **Model the business domains clearly, preserve history, enforce invariants in the database where possible, and keep tenant isolation non-optional.**
