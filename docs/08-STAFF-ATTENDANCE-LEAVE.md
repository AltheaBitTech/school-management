# CampusOps — Staff, Attendance & Leave Workflows

## 1. Purpose

This document defines the functional and technical workflows for:

- Staff management
- Staff onboarding and offboarding
- Department and reporting relationships
- Staff attendance
- Attendance correction and review
- Leave types and balances
- Leave requests
- Leave approvals
- Leave notifications
- Attendance and leave reporting
- Auditability and security

CampusOps is intended to complement an existing School ERP. It should manage operational staff information, attendance, leave, and related workflows without becoming a full academic ERP.

---

## 2. Scope

### In scope

- Staff profiles
- Employee/staff codes
- Department assignment
- Designation/job information
- Employment status
- Staff lifecycle
- Staff reporting relationships
- Staff attendance records
- Check-in/check-out workflow
- Attendance status
- Attendance corrections
- Attendance review
- Leave types
- Leave balances
- Leave requests
- Leave approval workflow
- Leave history
- Notifications
- Attendance and leave reports
- Audit logs

### Future / optional

- QR-based employee attendance
- Mobile attendance
- Biometric/device integrations
- GPS/geofenced attendance
- Advanced shift management
- Multiple shifts per day
- Payroll integration
- Vendor attendance integrations
- Automated attendance from access-control systems

The initial implementation should avoid introducing specialized hardware or infrastructure unless the product requirements explicitly require it.

---

# 3. Staff Domain

## 3.1 Staff profile

A staff record represents an employee or operational staff member associated with a school organization.

Typical information includes:

- Staff ID
- Employee code
- First name
- Last name
- Display name
- Mobile number
- Email
- Department
- Designation
- Joining date
- Employment status
- Reporting manager
- Profile photo
- Emergency/contact information where required
- Created/updated timestamps

Sensitive personal information should be minimized and protected according to the organization's requirements.

---

## 3.2 Staff vs User

`User` and `Staff` are different concepts.

### User

Represents an authenticated application identity.

A user may have:

- Login credentials
- Roles
- Permissions
- Organization membership
- Account status
- Authentication/security metadata

### Staff

Represents the employee/business entity.

A staff member may have:

- Employee code
- Department
- Designation
- Joining date
- Attendance
- Leave balance
- Employment status
- Reporting manager

A staff member may have a linked user account, but the business entity should not depend on authentication details for every operation.

This separation keeps identity/security concerns independent from HR/operations data.

---

# 4. Staff Lifecycle

## 4.1 Staff onboarding

Recommended workflow:

```text
Create Staff
    ↓
Validate Employee Code
    ↓
Assign Department / Designation
    ↓
Assign Reporting Manager
    ↓
Set Employment Status
    ↓
Optionally Create / Link User Account
    ↓
Staff Becomes Active
```

### Validation

The system should validate:

- Employee code uniqueness within the organization
- Valid department
- Valid reporting manager
- Valid employment status
- Valid joining date
- Linked user belongs to the same organization
- No duplicate active staff record for the same employee identity where applicable

---

## 4.2 Staff offboarding

Offboarding should not normally delete historical staff data.

Recommended workflow:

```text
Active
  ↓
Offboarding Initiated
  ↓
Set Last Working Date
  ↓
Deactivate / Archive Staff
  ↓
Revoke Application Access
```

Historical data should remain available according to retention policy:

- Attendance history
- Leave history
- Approval actions
- Complaint assignments
- Asset assignments
- Documents
- Audit records

The staff member should no longer be able to authenticate after account deactivation.

---

# 5. Department & Reporting Structure

Departments provide organizational grouping.

Examples:

- Administration
- Teaching
- Accounts
- Maintenance
- Transport
- Security
- IT

A staff member may belong to one primary department initially.

A reporting manager can be used for workflows such as:

- Leave approval
- Attendance review
- Staff visibility
- Operational escalation

The reporting hierarchy should not automatically grant unlimited access. Permissions must still be enforced through RBAC and resource-level authorization.

---

# 6. Roles vs Employment Attributes

Do not confuse:

### Application role

Controls what a user can do in CampusOps.

Examples:

- School Admin
- Principal
- Teacher
- Accountant
- Maintenance Staff
- Receptionist

### Employment information

Describes the staff member.

Examples:

- Department
- Designation
- Employment type
- Joining date
- Reporting manager

A teacher's designation does not automatically mean the person has every teacher-related application permission.

Authorization should be based on explicit roles/permissions.

---

# 7. Staff Attendance

## 7.1 Attendance objective

Attendance records should provide a reliable operational record of staff presence.

The initial architecture should support daily attendance without requiring biometric devices, QR hardware, or external attendance machines.

Future integrations can feed the same attendance domain through a provider/import boundary.

---

# 8. Attendance Record

A staff attendance record should conceptually contain:

- Organization
- Staff
- Attendance date
- Check-in time
- Check-out time
- Attendance status
- Late indicator where applicable
- Early departure indicator where applicable
- Correction/review information
- Remarks/reason
- Created/updated timestamps

A suitable conceptual status set is:

- PRESENT
- ABSENT
- HALF_DAY
- ON_LEAVE
- HOLIDAY
- WEEK_OFF

The exact statuses can be refined during implementation based on school policy.

---

# 9. Daily Attendance Workflow

## 9.1 Staff self check-in/check-out

Where self-attendance is enabled:

```text
Staff Opens Attendance
        ↓
System Identifies Authenticated Staff
        ↓
Check-in
        ↓
Attendance Record Created
        ↓
Later → Check-out
        ↓
Attendance Record Updated
```

The backend must derive the staff identity from the authenticated user/session.

Never accept an arbitrary `staffId` from the frontend and assume it is authorized.

---

## 9.2 Admin/authorized attendance marking

Authorized users may mark attendance for staff.

Example:

```text
Select Date
    ↓
View Staff List
    ↓
Mark Present / Absent / Half Day / Leave
    ↓
Add Optional Remark
    ↓
Save
    ↓
Audit Event
```

Bulk attendance marking can be supported because manually marking an entire staff group one record at a time is inefficient.

Bulk operations must still:

- Validate every staff member
- Enforce organization boundaries
- Enforce permission checks
- Produce appropriate audit records
- Avoid silently overwriting finalized attendance

---

# 10. Attendance Corrections

Attendance mistakes are expected in real operations.

Examples:

- Staff forgot to check out
- Incorrect check-in time
- Wrong attendance status
- Admin marked the wrong employee
- System/device integration produced an incorrect record

Recommended correction workflow:

```text
Original Attendance
        ↓
Correction Requested
        ↓
Reason Provided
        ↓
Authorized Review
        ↓
Approved / Rejected
        ↓
Attendance Updated
        ↓
Audit History Preserved
```

A correction should not erase evidence of the original state.

At minimum, the audit trail should capture:

- Who changed it
- When it changed
- Previous value
- New value
- Reason/context

---

# 11. Attendance Locking / Finalization

Schools may want attendance to become immutable after a cutoff.

Example:

```text
Attendance Open
      ↓
Daily Review
      ↓
Finalize
      ↓
Locked
```

After finalization:

- Normal users cannot edit the record
- Authorized administrators may request/unlock corrections
- Corrections should be audited

This prevents accidental modification of historical attendance.

Whether automatic daily locking is enabled should be configurable rather than hard-coded.

---

# 12. Attendance Rules

Attendance calculation should remain explicit and configurable.

Potential rules include:

- Late arrival threshold
- Early departure threshold
- Half-day threshold
- Minimum working hours
- Grace period
- School working days
- Holidays
- Week-offs

Do not hard-code these rules into controllers.

Prefer a dedicated attendance policy/service layer so the rules can evolve.

---

# 13. Leave Management

The requirements define these leave types:

- Casual Leave
- Sick Leave
- Earned Leave
- Half Day
- Emergency Leave

Leave types should be configurable per organization rather than deeply hard-coded.

A `LeaveType` can conceptually contain:

- Name
- Code
- Description
- Active/inactive status
- Whether balance is tracked
- Whether attachment/reason is required
- Whether half-day is allowed
- Organization

---

# 14. Leave Balance

A leave balance represents an employee's available leave for a configured period.

Conceptually:

```text
Staff
  +
Leave Type
  +
Leave Year / Period
  ↓
Leave Balance
```

A balance may include:

- Opening balance
- Allocated/accrued amount
- Used amount
- Pending amount
- Available amount
- Adjustment amount

### Important rule

Do not rely only on a frontend-calculated available balance.

The backend must calculate and validate availability during leave submission/approval.

---

# 15. Leave Request Lifecycle

Recommended lifecycle:

```text
DRAFT
  ↓
SUBMITTED
  ↓
PENDING_APPROVAL
  ↓
APPROVED
  ↓
(or REJECTED)
  ↓
CANCELLED
```

Exact statuses may be simplified, but the business meaning must remain clear.

A leave request should contain:

- Organization
- Staff
- Leave type
- Start date
- End date
- Half-day information where applicable
- Requested duration
- Reason
- Supporting attachment where required
- Current status
- Submitted timestamp
- Approved/rejected timestamp
- Created/updated timestamps

---

# 16. Leave Submission

## 16.1 Staff workflow

```text
Staff Opens Leave
      ↓
Select Leave Type
      ↓
Select Date / Duration
      ↓
System Checks Eligibility
      ↓
Enter Reason
      ↓
Optional / Required Attachment
      ↓
Submit
      ↓
Approval Workflow Starts
```

Before submission, the backend should validate:

- Staff is active
- Leave type is active
- Dates are valid
- End date is not before start date
- Duration is valid
- Half-day rules are respected
- Required reason/attachment exists
- Organization context is correct
- Existing overlapping leave is handled
- Balance rules are satisfied where applicable

---

# 17. Leave Approval

Leave should use the reusable approval workflow defined by the platform.

Example:

```text
Leave Request
     ↓
Reporting Manager
     ↓
Principal / Admin
     ↓
Final Decision
```

Not every school needs multiple levels, so the workflow should be configurable.

Approval actions should capture:

- Approver
- Approval step
- Decision
- Comment
- Timestamp

Business ownership remains with the Leave module.

The reusable Approval module manages workflow mechanics; it should not own leave-specific business rules.

---

# 18. Leave Balance Concurrency

Two simultaneous leave requests must not accidentally consume the same balance.

Example:

```text
Available Leave = 2 days

Request A → 2 days
Request B → 2 days
```

The backend must prevent both requests from incorrectly succeeding when only two days are available.

Use database transactions and appropriate locking/consistency strategies where required.

The final balance should be determined server-side.

---

# 19. Leave Cancellation

A staff member may need to cancel an approved or pending leave.

Possible workflow:

```text
Pending → Cancelled
Approved → Cancellation Requested → Approved/Rejected
```

The exact policy should be configurable.

When approved leave is cancelled:

- Leave balance should be restored appropriately
- Attendance should not remain incorrectly marked as leave
- Related notifications may be generated
- Audit history must remain intact

Cancellation should be idempotent.

---

# 20. Attendance and Leave Relationship

Attendance and leave are separate domains but interact.

Example:

```text
Approved Leave
      ↓
Attendance Date
      ↓
ON_LEAVE
```

The attendance system should not blindly overwrite manually corrected attendance.

A safe rule is:

- Approved leave can provide the expected attendance state.
- Manual/admin corrections remain auditable.
- Conflicts require explicit business rules rather than silent overwrites.

---

# 21. Holidays and Week-offs

Attendance and leave calculations depend on the school's working calendar.

A future calendar configuration may include:

- Holidays
- Week-offs
- Working days
- Special working days

The initial version can use a simpler organization-level calendar configuration.

Do not build a complex shift/calendar engine unless the product actually needs it.

---

# 22. Notifications

Useful notification events include:

### Leave

- Leave request submitted
- Leave request assigned to approver
- Leave approved
- Leave rejected
- Leave cancellation
- Approval reminder

### Attendance

- Missing check-out
- Attendance correction submitted
- Attendance correction approved/rejected
- Attendance anomaly where configured

Notification delivery should use the platform notification abstraction.

Channels may include:

- Email
- Push
- SMS/WhatsApp in a future or optional integration

Notification delivery should not be tightly coupled to leave or attendance business logic.

---

# 23. Permissions

Suggested permissions include:

```text
staff.view
staff.create
staff.update
staff.deactivate

attendance.view_self
attendance.check_in
attendance.check_out
attendance.view
attendance.mark
attendance.correct
attendance.finalize

leave.view_self
leave.create
leave.cancel_self
leave.view
leave.approve
leave.reject
leave.configure_types
leave.manage_balances
```

These are examples, not a mandatory final permission list.

Resource-level rules still apply.

For example:

- Staff can view their own attendance.
- Staff can view their own leave.
- Managers can view authorized staff under their scope.
- School Admin/Principal can access broader organizational data according to assigned permissions.
- A user from Organization A must never access Organization B's staff, attendance, or leave.

---

# 24. Tenant Isolation

Every staff, attendance, and leave operation must be scoped to the authenticated organization.

Never trust:

```text
organizationId
```

from the client as the authorization boundary.

The backend should derive the active organization from the authenticated context and verify all related resources belong to it.

Example:

```text
Authenticated User
      ↓
Organization Context
      ↓
Staff
      ↓
Attendance / Leave
```

A valid staff ID from another organization must behave as inaccessible.

This protects against IDOR/BOLA-style vulnerabilities.

---

# 25. Staff Assignment to Other Modules

Staff records may be referenced by:

- Complaints
- Maintenance tasks
- Assets
- Documents
- Events
- Notices
- Approval workflows
- Notifications

Deleting a staff row should therefore be avoided when historical references matter.

Prefer:

```text
Active
Inactive
Offboarded
Archived
```

with appropriate business rules.

---

# 26. Reporting

Useful reports include:

### Attendance

- Daily attendance
- Monthly attendance
- Staff attendance summary
- Present/absent/half-day counts
- Late arrivals
- Missing check-outs
- Attendance corrections

### Leave

- Leave requests by status
- Leave by staff
- Leave by department
- Leave by leave type
- Approved leave by date range
- Leave balance summary
- Pending approvals
- Leave utilization

Reports must enforce the same authorization rules as normal screens.

A user should not gain access to restricted staff data simply by using a report endpoint.

---

# 27. Frontend UX

## Staff screens

Useful screens include:

- Staff list
- Staff profile
- Add staff
- Edit staff
- Staff status/lifecycle
- Department filtering
- Staff search
- Staff detail history

## Attendance screens

### Staff

- Today's attendance
- Check-in
- Check-out
- Attendance history
- Correction request

### Admin/Manager

- Daily attendance board
- Staff/date filters
- Bulk marking
- Attendance corrections
- Finalization/review
- Attendance reports

## Leave screens

### Staff

- Leave balance
- Apply leave
- Leave history
- Request details
- Cancellation

### Approver

- Pending approvals
- Request details
- Approve/reject
- Comment
- Approval history

The UI should make status obvious and avoid forcing users to understand internal workflow IDs.

---

# 28. UI Quality Standards

Follow the design standards from the frontend architecture:

- Use a consistent mature component system such as MUI.
- Keep forms predictable.
- Use clear status badges.
- Show available leave before submission.
- Clearly distinguish pending, approved, rejected, and cancelled states.
- Prevent duplicate submissions with loading/disabled states.
- Use confirmation dialogs for destructive or high-impact actions.
- Provide useful empty states.
- Provide clear validation messages.
- Support responsive layouts.
- Ensure keyboard accessibility and readable contrast.
- Avoid excessive modals and decorative UI.

For attendance, the primary action should be immediately visible.

For leave, the user should understand:

```text
Leave Type
Available Balance
Requested Duration
Dates
Approval Status
```

without navigating through multiple screens.

---

# 29. API Boundaries

Representative endpoints:

```text
GET    /staff
POST   /staff
GET    /staff/:id
PATCH  /staff/:id
POST   /staff/:id/deactivate

GET    /attendance
POST   /attendance/check-in
POST   /attendance/check-out
POST   /attendance/mark
POST   /attendance/:id/correction
POST   /attendance/:id/finalize

GET    /leave/types
GET    /leave/balances
POST   /leave/requests
GET    /leave/requests
GET    /leave/requests/:id
POST   /leave/requests/:id/cancel

GET    /leave/approvals
POST   /leave/requests/:id/approve
POST   /leave/requests/:id/reject
```

These are conceptual API boundaries. Final route names should follow the project's API conventions.

---

# 30. Backend Module Structure

Recommended NestJS structure:

```text
src/
├── staff/
│   ├── staff.controller.ts
│   ├── staff.service.ts
│   ├── dto/
│   └── ...
│
├── attendance/
│   ├── attendance.controller.ts
│   ├── attendance.service.ts
│   ├── policies/
│   ├── dto/
│   └── ...
│
├── leave/
│   ├── leave.controller.ts
│   ├── leave.service.ts
│   ├── policies/
│   ├── dto/
│   └── ...
│
├── approvals/
├── notifications/
├── audit/
├── users/
├── departments/
└── prisma/
```

The exact folder structure may evolve, but business ownership should remain clear.

---

# 31. Database Impact

The database architecture already defines the core entities for:

- Staff
- Department
- LeaveType
- LeaveBalance
- LeaveRequest
- Approval workflow entities

The staff attendance model should be explicitly added/refined in `03-DATABASE-ARCHITECTURE.md` during implementation.

A conceptual `StaffAttendance` / `AttendanceRecord` entity should contain:

```text
id
organizationId
staffId
attendanceDate
checkInAt
checkOutAt
status
remarks
correction metadata
createdAt
updatedAt
```

Recommended uniqueness:

```text
organizationId + staffId + attendanceDate
```

if the product uses one attendance record per staff member per day.

If future shift/multi-session attendance is introduced, this constraint may need to evolve.

---

# 32. Transactions

Use database transactions for operations that must remain consistent.

Examples:

### Leave approval

```text
Begin Transaction
    ↓
Validate request
    ↓
Validate balance
    ↓
Update leave state/balance
    ↓
Record approval action
    ↓
Create notification event
Commit
```

### Attendance correction

```text
Begin Transaction
    ↓
Validate authorization
    ↓
Validate current state
    ↓
Update attendance
    ↓
Record audit event
Commit
```

Do not perform a critical business update first and assume later steps will always succeed.

---

# 33. Audit Requirements

Audit important actions such as:

- Staff creation
- Staff modification
- Staff deactivation
- Attendance marking
- Attendance correction
- Attendance finalization
- Leave submission
- Leave approval/rejection
- Leave cancellation
- Leave balance adjustment
- Leave type configuration

Audit records should answer:

```text
Who?
What?
Which organization?
Which resource?
When?
What changed?
Why/context?
```

Business history and security audit logs should remain conceptually separate.

---

# 34. Validation & Error Handling

Examples:

```text
Invalid staff → 404/appropriate resource error
Unauthorized staff access → 403 or resource-not-found semantics
Duplicate attendance → conflict/business validation error
Invalid leave dates → validation error
Insufficient balance → business rule error
Already approved request → invalid state transition
Finalized attendance edit → conflict/business rule error
Inactive staff check-in → business rule error
```

Errors should be predictable so the frontend can show useful messages.

---

# 35. Idempotency

Operations that may be retried should be safe.

Examples:

- Check-in
- Check-out
- Leave cancellation
- Approval action
- Notification enqueueing

A network retry must not create duplicate attendance records or apply the same approval twice.

---

# 36. Testing Strategy

## Staff

- Create staff
- Duplicate employee code
- Update staff
- Deactivate staff
- Organization isolation
- Permission checks

## Attendance

- Check-in
- Duplicate check-in
- Check-out
- Missing check-out
- Admin marking
- Bulk marking
- Correction
- Finalization
- Unauthorized access
- Cross-tenant access
- Concurrent operations

## Leave

- Leave creation
- Invalid dates
- Balance validation
- Overlapping leave
- Half-day
- Approval
- Rejection
- Cancellation
- Balance restoration
- Concurrent requests
- Multi-level approval
- Cross-tenant isolation

## Integration

Test:

```text
Leave Approved
   ↓
Notification
   ↓
Attendance / calendar impact where configured
   ↓
Audit
```

The goal is to verify complete business flows rather than only isolated controller methods.

---

# 37. MVP Implementation

Recommended initial scope:

### Staff

- Staff CRUD
- Employee code
- Department
- Designation
- Reporting manager
- Active/inactive status
- Optional linked user

### Attendance

- Daily attendance
- Check-in/check-out
- Admin marking
- Present/absent/half-day/leave
- Attendance history
- Basic correction workflow
- Audit trail

### Leave

- Configurable leave types
- Leave balances
- Leave request
- Approval workflow
- Approve/reject
- Leave history
- Basic notifications

### Reports

- Attendance summary
- Leave summary
- Pending approvals

---

# 38. Defer From MVP

Avoid initially building:

- Biometric hardware integrations
- Complex shift engines
- GPS attendance
- Payroll
- Device fleet management
- Advanced workforce scheduling
- Multi-session attendance
- Complex accrual engines
- Large-scale event streaming
- Dedicated attendance microservice

These can be introduced after real usage demonstrates the need.

---

# 39. Future QR Attendance

The requirements identify QR-based employee attendance as a future capability.

A future design could be:

```text
QR / Mobile Device
       ↓
Attendance API
       ↓
Attendance Validation
       ↓
Staff Attendance
       ↓
Audit
```

The QR mechanism should be treated as an input method, not as a separate attendance domain.

This allows future QR/mobile/device integrations to reuse the same:

- Attendance rules
- Authorization
- Tenant isolation
- Audit
- Reporting

---

# 40. Implementation Principles

1. Keep Staff, Attendance, and Leave as clear business modules.
2. Separate User authentication from Staff business data.
3. Use explicit permissions rather than relying only on job titles.
4. Enforce organization isolation in backend queries.
5. Never trust client-supplied organization or staff identity for authorization.
6. Keep attendance corrections auditable.
7. Validate leave balances on the server.
8. Use transactions for balance/state changes.
9. Reuse the platform approval workflow.
10. Keep notification providers behind an abstraction.
11. Avoid premature biometric/QR/device infrastructure.
12. Keep reports subject to the same permissions as normal data.
13. Preserve historical staff data after offboarding.
14. Make important state transitions explicit and idempotent.
15. Keep the system simple enough to operate cost-effectively.

---

# 41. End-to-End Example

## Staff applies for leave

```text
Staff logs in
    ↓
Opens Leave
    ↓
Views balance
    ↓
Selects Sick Leave
    ↓
Selects dates
    ↓
Enters reason
    ↓
Submits request
    ↓
Backend validates:
  - active staff
  - organization
  - dates
  - overlap
  - balance
    ↓
Approval request created
    ↓
Manager notified
    ↓
Manager approves
    ↓
Approval recorded
    ↓
Leave balance updated
    ↓
Staff notified
    ↓
Attendance for affected dates reflects ON_LEAVE
    ↓
Audit records retained
```

This workflow demonstrates the intended interaction between Staff, Leave, Approval, Notification, Attendance, and Audit modules.

---

# 42. Final Architecture Position

The Staff, Attendance & Leave domain should remain a **modular part of the CampusOps NestJS monolith**, backed by PostgreSQL/Prisma.

The design should support the current operational requirements while leaving clean extension points for:

- QR attendance
- Mobile apps
- Biometric/device integrations
- Advanced calendars
- Payroll/ERP integrations

The most important architectural principle is:

> **Keep the core attendance and leave business logic independent of the mechanism used to capture attendance or deliver notifications.**

That gives CampusOps a simple MVP today without creating a dead-end architecture for future school requirements.
