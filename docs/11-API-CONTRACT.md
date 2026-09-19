# CampusOps — API Contract

## 1. Purpose

This document defines conventions for the CampusOps REST API.

The API is the contract between the Next.js frontend, external integrations, and the NestJS backend.

The backend is the final authority for:

- Authentication
- Authorization
- Tenant isolation
- Validation
- Business rules
- State transitions

---

# 2. API Principles

1. Use resource-oriented REST endpoints.
2. Keep authentication and authorization server-side.
3. Validate every request with DTOs.
4. Never trust organization IDs supplied by clients as an authorization boundary.
5. Return predictable errors.
6. Use pagination for potentially large collections.
7. Keep state transitions explicit.
8. Use consistent timestamps and identifiers.
9. Avoid leaking whether another tenant's resource exists.
10. Document APIs with OpenAPI/Swagger.

---

# 3. Base URL & Versioning

Use a versioned API boundary such as:

```text
/api/v1
```

Example:

```text
GET /api/v1/staff
```

The exact deployment prefix can be configured.

Avoid putting vendor/provider details into public API routes.

---

# 4. Authentication

Recommended:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

If email verification is enabled:

```text
POST /auth/verify-email
POST /auth/resend-verification
```

Access tokens should be short-lived.

Refresh tokens should support rotation/revocation.

---

# 5. Organization Context

Authenticated requests should derive organization context from the authenticated identity/session.

Do not design endpoints where:

```text
GET /organizations/:organizationId/students
```

becomes the sole security boundary.

If organization selection is supported for platform users, the server must validate that the user is actually authorized for that organization.

---

# 6. Resource Identifiers

Use UUIDs for database/API identifiers where appropriate.

Human-readable codes can be used for operational references:

```text
EMP-000123
AST-000452
VIS-2026-0012
REC-2026-0042
```

Do not expose sequential database IDs as the only security mechanism.

---

# 7. Request Validation

NestJS DTO validation should enforce:

- Required fields
- Type constraints
- Enum values
- Length limits
- Date formats
- Numeric ranges
- File metadata constraints
- Nested object validation

Business rules belong in services/domain logic, not only DTO validation.

---

# 8. Standard Response Shape

A consistent success response can use:

```json
{
  "data": {},
  "meta": {}
}
```

For a list:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

Do not expose internal database implementation details.

---

# 9. Error Contract

Recommended shape:

```json
{
  "statusCode": 400,
  "code": "LEAVE_BALANCE_INSUFFICIENT",
  "message": "Insufficient leave balance",
  "details": {}
}
```

The `code` should be stable for frontend logic.

Human-readable `message` can change.

Never return stack traces in production.

---

# 10. HTTP Semantics

Use appropriate methods:

```text
GET     Read
POST    Create / action where appropriate
PATCH   Partial update
PUT     Full replacement where genuinely required
DELETE  Deletion where safe
```

For business transitions, explicit action endpoints can be clearer:

```text
POST /leave/requests/:id/approve
POST /leave/requests/:id/reject
POST /assets/:id/retire
POST /attendance/:id/finalize
```

---

# 11. Pagination

Default to pagination for collections.

Support:

```text
page
pageSize
```

or cursor pagination where appropriate.

Enforce maximum page size server-side.

Example:

```text
GET /staff?page=2&pageSize=25
```

---

# 12. Filtering

Use predictable query parameters.

Example:

```text
GET /complaints?status=OPEN&priority=HIGH
GET /staff?departmentId=...
GET /leave/requests?status=PENDING_APPROVAL
GET /assets?status=IN_MAINTENANCE
```

All filters must remain tenant-scoped.

---

# 13. Search

Search should be explicit.

Example:

```text
GET /staff?search=rajesh
GET /assets?search=projector
```

Avoid implementing unbounded wildcard searches that can become expensive at scale.

Add database indexes for common search patterns.

---

# 14. Sorting

Example:

```text
?sortBy=createdAt&sortOrder=desc
```

Only allow known sortable fields.

Never directly concatenate arbitrary client input into SQL/Prisma ordering expressions.

---

# 15. Staff API

Representative contract:

```text
GET    /staff
POST   /staff
GET    /staff/:id
PATCH  /staff/:id
POST   /staff/:id/deactivate
POST   /staff/:id/provision-login
```

`POST /staff/:id/provision-login` creates a login account for an existing staff member in the authenticated organization.

Request body:

```json
{
  "email": "rajesh.kumar@sunrise-school.test",
  "password": "TemporaryPass123!",
  "roleId": "<uuid>"
}
```

Rules:

- `organizationId` is derived from the authenticated user; it must not be supplied by the client
- Requires `user.create` and `role.assign`
- Staff must belong to the authenticated organization
- Staff must not already have `userId`
- Offboarded staff cannot be provisioned
- Email is normalized and must be unique within the organization
- Role must belong to the same organization; platform/SaaS roles are rejected
- Password is hashed server-side and never returned
- User creation, role assignment, staff linkage, and audit records occur in one transaction

Response:

```json
{
  "data": {
    "staff": { "...Staff..." },
    "loginEmail": "rajesh.kumar@sunrise-school.test"
  }
}
```

Representative errors:

```text
STAFF_NOT_FOUND
STAFF_LOGIN_ALREADY_PROVISIONED
STAFF_NOT_ELIGIBLE_FOR_LOGIN
DUPLICATE_USER_EMAIL
INVALID_ROLE
FORBIDDEN
```

The Staff API should enforce:

- Tenant isolation
- Permission checks
- Employee code uniqueness
- Valid department
- Valid reporting manager

---

# 15a. Roles API

```text
GET /roles
```

Lists organization-scoped roles for the authenticated tenant.

Rules:

- Requires `role.view`
- Returns only roles where `organizationId` matches the authenticated organization
- Platform/SaaS roles (`organizationId = null`) are excluded

---

# 16. Student API

Representative:

```text
GET    /students
POST   /students
GET    /students/:id
PATCH  /students/:id
POST   /students/:id/deactivate
```

Student APIs should respect the CampusOps/ERP boundary.

If the academic ERP is the source of truth, synchronization/import APIs should be treated separately.

---

# 16A. Fees API (MVP)

Implemented fee-management endpoints for the first vertical slice:

```text
GET    /fees/structures
POST   /fees/structures
GET    /fees/student-fees
POST   /fees/student-fees
GET    /fees/student-fees/:id
POST   /fees/student-fees/:id/payments
GET    /fees/students/:studentId/summary
```

Permissions:

- `fee.view` — list/read fee structures, student fees, and student summaries
- `fee.create` — create fee structures
- `fee.assign` — assign a fee structure to a student
- `fee.record_payment` — record a payment against a student fee assignment

Rules:

- Organization context is derived from the authenticated user; client-supplied `organizationId` is not accepted.
- Fee structure and payment amounts must be greater than zero.
- Payment amount cannot exceed the server-calculated outstanding balance.
- Student fee status is server-derived: `PENDING`, `PARTIALLY_PAID`, or `PAID`.
- Payments against a `PAID` student fee are rejected.
- Payment recording and student-fee status updates occur atomically in a transaction with row locking.
- Cross-tenant access to fee structures, student fees, students, or payments returns the standard not-found/forbidden behavior.

List endpoints support pagination and basic filters:

- `/fees/structures` — optional `status`
- `/fees/student-fees` — optional `studentId`, `feeStructureId`, `status`

Payment methods: `CASH`, `BANK_TRANSFER`, `UPI`, `OTHER`.

Audit events recorded for create/assign/payment actions:

- `FEE_STRUCTURE_CREATED`
- `STUDENT_FEE_ASSIGNED`
- `FEE_PAYMENT_RECORDED`

This slice does not include payment gateways, refunds, receipts, reminders, or accounting ledger behavior.

---

# 17. Attendance API

```text
GET  /attendance
POST /attendance/check-in
POST /attendance/check-out
POST /attendance/mark
POST /attendance/:id/correction
POST /attendance/:id/finalize
```

Self-service endpoints must derive the staff member from authenticated identity.

---

# 18. Leave API

```text
GET  /leave/types
GET  /leave/balances
GET  /leave/requests
POST /leave/requests
GET  /leave/requests/:id
POST /leave/requests/:id/cancel

GET  /leave/approvals
POST /leave/requests/:id/approve
POST /leave/requests/:id/reject
```

Approval endpoints must verify that the authenticated user is the correct approver for the current workflow step.

---

# 19. Complaint API

```text
GET  /complaints
POST /complaints
GET  /complaints/:id
PATCH /complaints/:id
POST /complaints/:id/assign
POST /complaints/:id/status
POST /complaints/:id/comments
```

Valid status transitions should be enforced server-side.

---

# 20. Visitor API

```text
GET  /visitors
POST /visitors
GET  /visitors/:id
POST /visitors/:id/check-in
POST /visitors/:id/check-out
```

Visitor access should be restricted according to role and operational need.

Visitor photos/documents must use protected file access.

---

# 21. Notice API

```text
GET  /notices
POST /notices
GET  /notices/:id
PATCH /notices/:id
POST /notices/:id/publish
POST /notices/:id/archive
POST /notices/:id/read
POST /notices/:id/acknowledge
```

Audience filtering must be enforced server-side.

---

# 22. Asset API

```text
GET  /assets
POST /assets
GET  /assets/:id
PATCH /assets/:id
POST /assets/:id/assign
POST /assets/:id/transfer
POST /assets/:id/maintenance
POST /assets/:id/retire
```

Transfers and retirement are business actions and should be audited.

---

# 23. Document API

Implemented in Phase 10B for the Bonafide Certificate vertical slice:

```text
GET  /documents
POST /documents/bonafide
GET  /documents/:id
GET  /documents/:id/download
```

Future document types and template management endpoints remain out of scope for Phase 10B.

Download authorization must be checked independently from document lookup.

---

# 24. Approval API

If approval workflow is exposed as a reusable platform resource:

```text
GET /approvals
GET /approvals/:id
POST /approvals/:id/approve
POST /approvals/:id/reject
```

Business modules remain responsible for validating the underlying business request.

---

# 25. Event API

```text
GET    /events
POST   /events
GET    /events/:id
PATCH  /events/:id
POST   /events/:id/schedule
POST   /events/:id/cancel
POST   /events/:id/complete
POST   /events/:id/archive

GET    /events/:id/participants
POST   /events/:id/participants
DELETE /events/:id/participants/:participantId

GET    /venues
POST   /venues
GET    /venues/:id
PATCH  /venues/:id
```

The generic event `PATCH` endpoint updates event details, type, time, and venue.
It does not accept `status`; lifecycle transitions use the explicit action
endpoints above.

Event lifecycle:

```text
DRAFT → SCHEDULED → COMPLETED → ARCHIVED
DRAFT → CANCELLED
SCHEDULED → CANCELLED
```

New events are created as `DRAFT`. Event participant visibility and all venue,
event, and participant operations must respect organization and audience rules.

---

# 26. Notification API

## Notifications

```text
GET /notifications
POST /notifications/:id/read
```

Access model:

- Authenticated users only
- Self access only (`recipientUserId` must match the current user)
- Always scoped to the authenticated user's organization
- Client must not supply `organizationId` or `recipientUserId`

Supported query parameters for list:

```text
page=1
pageSize=25
```

List responses are paginated, ordered newest first with deterministic tie-breaking
by notification ID.

Mark-read lookups must match:

```text
id
organizationId
recipientUserId
```

Users cannot mark another user's notification as read.

Representative preference endpoints (not implemented in Notification Foundation):

```text
GET   /notification-preferences
PATCH /notification-preferences
POST  /notifications/read-all
```

## Provider configuration

Notification Foundation supports configuration-based email delivery:

```text
EMAIL_PROVIDER=console|resend
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

When `EMAIL_PROVIDER=console`, Resend credentials are not required.
When `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are required.

Email delivery failures do not roll back already-completed business operations.

---

# 27. Reports API

Reports should use explicit endpoints or a consistent reporting resource.

## Event Operations Report

```text
GET /reports/events
```

Required permission:

```text
report.event.view
```

Supported query parameters:

```text
fromDate=YYYY-MM-DD
toDate=YYYY-MM-DD
type=SPORTS_DAY|PTM|HOLIDAY|EXAMINATION|MEETING|ANNUAL_DAY
status=DRAFT|SCHEDULED|COMPLETED|ARCHIVED|CANCELLED
venueId=<uuid>
page=1
pageSize=25
```

`fromDate` and `toDate` are calendar dates in the authenticated
organization's configured timezone. The backend converts the local-day
boundaries to UTC instants before querying Event timestamps. The report is
always scoped to the authenticated organization; `organizationId` is not an
accepted client filter.

The response contains paginated report rows, pagination metadata, and summary
counts by Event status. Report rows expose only Event identity, title, type,
status, timestamps, and Venue identity/name.

Users without `report.event.view` receive `403 Forbidden`.

Examples:

```text
GET /reports/attendance
GET /reports/leave
GET /reports/complaints
GET /reports/assets
GET /reports/visitors
GET /reports/events
```

Export formats:

```text
format=pdf
format=xlsx
format=csv
```

Exports must use the same authorization rules as the underlying report.

---

# 28. Audit API

## Audit Logs

```text
GET /audit-logs
```

Required permission:

```text
audit.view
```

Supported query parameters:

```text
action=<audit action>
entityType=<entity type>
entityId=<uuid>
fromDate=YYYY-MM-DD
toDate=YYYY-MM-DD
page=1
pageSize=25
```

Audit logs are always scoped to the authenticated user's organization.
`organizationId` is not an accepted client filter.

Date filters use UTC calendar-day boundaries on `createdAt`.

The response contains paginated audit rows and pagination metadata.
Rows expose actor, action, entity, request ID, sanitized snapshots, metadata,
and timestamp.

Users without `audit.view` receive `403 Forbidden`.

Audit records are append-only and cannot be created or modified through a
public write endpoint.

Representative activity endpoint (not implemented in Audit Foundation):

```text
GET /activity
```

Audit access should be restricted.

Do not expose sensitive audit metadata unnecessarily to ordinary users.

---

# 29. File API

Use controlled upload/download operations.

Example:

```text
POST /files
GET  /files/:id
GET  /files/:id/download
```

Files must be associated with authorized organization/resources.

Never make every uploaded file publicly accessible by default.

---

# 30. Idempotency

For retry-sensitive operations, consider:

```text
Idempotency-Key: <unique-key>
```

Especially for:

- Payment creation
- Attendance check-in/out
- Approval actions
- Document generation
- Notification requests

The server should define which endpoints actually support idempotency.

---

# 31. Rate Limiting

Rate-limit at least:

- Login
- Password reset
- OTP/verification endpoints
- Public/unauthenticated endpoints
- File uploads
- Expensive report generation

Limits should account for organization and user where appropriate.

---

# 32. OpenAPI

Maintain Swagger/OpenAPI documentation from NestJS decorators/metadata.

Document:

- Authentication
- Request DTOs
- Response schemas
- Error codes
- Pagination
- Permissions
- State transitions
- File endpoints

Generated documentation should reflect the actual implementation.

---

# 33. API Security Checklist

Before production:

- Authentication enforced
- Authorization enforced
- Tenant scope enforced
- DTO validation enabled
- Request size limits configured
- Rate limiting enabled
- Sensitive fields excluded
- File access protected
- Error leakage prevented
- CORS restricted
- Security headers configured
- Audit events implemented
- Logs contain correlation IDs
- Swagger exposure controlled appropriately

---

# 34. Frontend Integration

The Next.js frontend should use one centralized API client.

It should handle:

- Base URL
- Authentication
- Refresh flow
- Error normalization
- Request IDs where appropriate
- JSON parsing
- File downloads
- Retry policy where safe

Feature components should not construct raw fetch logic repeatedly.

---

# 35. Contract Testing

Important API contracts should have tests for:

- Authentication
- Permissions
- Tenant isolation
- Validation
- State transitions
- Pagination
- Error codes
- File authorization

End-to-end tests should verify representative complete workflows.

---

# 36. Final Principle

The API should be predictable enough that frontend development feels boring—in a good way.

Business complexity belongs in well-defined backend modules, while the public API exposes clear resources and explicit actions.
