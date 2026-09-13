# CampusOps — Backend Architecture

**Document:** 05-BACKEND-ARCHITECTURE.md  
**Product:** School Operations Management SaaS / CampusOps  
**Status:** Architecture specification  
**Previous:** 04-AUTH-RBAC-TENANCY.md  
**Next:** 06-FRONTEND-ARCHITECTURE.md

---

## 1. Purpose

This document defines the backend architecture for CampusOps.

The target backend is a **NestJS modular monolith** using:

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- REST APIs
- JWT authentication
- Provider abstractions for external services
- Local file storage initially, behind a storage abstraction

The architecture should remain simple enough for a small team to build and deploy, while keeping clear boundaries so individual domains can evolve later.

---

## 2. Core Backend Principles

CampusOps follows these principles:

1. **Modular monolith first**
2. **Domain-oriented modules**
3. **Controllers stay thin**
4. **Business rules live in services/domain logic**
5. **Prisma access stays behind backend services/repositories**
6. **DTOs validate external input**
7. **Authentication and authorization happen before business operations**
8. **Every tenant-owned query is organization-scoped**
9. **Transactions protect multi-step state changes**
10. **External providers are accessed through abstractions**
11. **Business modules own their business state**
12. **Shared infrastructure provides reusable capabilities**
13. **Avoid premature microservices**
14. **Make operational behavior observable and auditable**

---

## 3. High-Level Architecture

```text
                    ┌─────────────────────┐
                    │      Next.js UI     │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │     NestJS API      │
                    │                     │
                    │ Controllers         │
                    │      ↓              │
                    │ Guards / Validation │
                    │      ↓              │
                    │ Application Services│
                    │      ↓              │
                    │ Domain Services     │
                    │      ↓              │
                    │ Prisma / Repos      │
                    └───────┬──────┬──────┘
                            │      │
                 ┌──────────┘      └───────────┐
                 ▼                              ▼
        ┌────────────────┐             ┌────────────────┐
        │  PostgreSQL    │             │ External APIs  │
        │  + Prisma      │             │ Email/Storage  │
        └────────────────┘             └────────────────┘
```

The backend remains one deployable application initially.

---

## 4. Recommended Project Structure

```text
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   ├── organizations/
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   ├── students/
│   ├── staff/
│   ├── departments/
│   ├── complaints/
│   ├── leave/
│   ├── visitors/
│   ├── notices/
│   ├── assets/
│   ├── documents/
│   ├── approvals/
│   ├── events/
│   ├── notifications/
│   ├── reports/
│   ├── audit/
│   ├── activity/
│   ├── files/
│   ├── health/
│   └── common/
│       ├── decorators/
│       ├── guards/
│       ├── interceptors/
│       ├── filters/
│       ├── pipes/
│       ├── exceptions/
│       ├── types/
│       └── utils/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── test/
```

The NestJS backend lives in `apps/api/`. The Next.js frontend lives in `apps/web/`. Domain module boundaries should remain recognizable within `apps/api/src/`.

---

## 5. Module Categories

### Platform Modules

```text
Auth
Organizations
Users
Roles
Permissions
Health
```

### Business Modules

```text
Students
Staff
Departments
Complaints
Leave
Visitors
Notices
Assets
Documents
Approvals
Events
```

### Shared Operational Modules

```text
Notifications
Files
Reports
Audit
Activity
```

### Common Infrastructure

```text
Validation
Exception handling
Logging
Configuration
Request context
Security
Database
```

---

## 6. Layered Request Flow

A typical request should flow like this:

```text
HTTP Request
    ↓
Middleware
    ↓
Authentication Guard
    ↓
Permission Guard
    ↓
Validation Pipe
    ↓
Controller
    ↓
Application Service
    ↓
Domain Rules
    ↓
Prisma / Repository
    ↓
PostgreSQL
    ↓
Response Mapper
    ↓
HTTP Response
```

Cross-cutting concerns such as logging and error handling wrap this flow.

---

## 7. Controllers

Controllers handle HTTP concerns:

- routes
- validated DTOs
- authentication context
- service invocation
- response DTOs

Controllers should not contain substantial business logic.

Prefer:

```ts
@Post()
create(
  @AuthContext() auth: AuthContext,
  @Body() dto: CreateComplaintDto,
) {
  return this.complaintService.create(auth, dto);
}
```

rather than placing business rules directly in the controller.

---

## 8. DTO Validation

Every externally supplied request body, query, and parameter should be validated server-side.

Typical NestJS approach:

```text
class-validator
class-transformer
ValidationPipe
```

Example:

```ts
export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ComplaintPriority)
  priority: ComplaintPriority;

  @IsUUID()
  categoryId: string;
}
```

Frontend validation improves UX but never replaces backend validation.

---

## 9. Global Validation

A global validation pipe should be configured.

Conceptually:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
);
```

The exact configuration should be tested against all DTOs before production.

---

## 10. Authentication Integration

Protected endpoints follow the authentication architecture from `04-AUTH-RBAC-TENANCY.md`:

```text
JwtAuthGuard
      ↓
AuthContext
      ↓
PermissionsGuard
      ↓
Controller
```

The controller/service receives trusted user and organization context.

Client-provided tenant identifiers must not become the authorization source.

---

## 11. Application Services

Application services coordinate use cases.

Examples:

```text
ComplaintService
LeaveService
VisitorService
NoticeService
AssetService
DocumentService
ApprovalService
EventService
```

A service may coordinate validation, authorization-sensitive checks, domain rules, persistence, transactions, audit records, and notifications.

Avoid giant "god services".

---

## 12. Domain Logic

Business rules belong close to the domain they govern.

Example complaint lifecycle:

```text
OPEN
  ↓
ASSIGNED
  ↓
IN_PROGRESS
  ↓
COMPLETED
  ↓
CLOSED
```

The complaint domain should determine whether a transition is valid.

Do not let arbitrary controllers directly set business state without validation.

---

## 13. Prisma / Repository Access

Prisma is the initial persistence mechanism.

A modular-monolith implementation can keep Prisma access in domain services when queries are straightforward.

Example:

```ts
const complaint = await this.prisma.complaint.findFirst({
  where: {
    id: complaintId,
    organizationId: auth.organizationId,
  },
});
```

Introduce dedicated repositories when they provide a real benefit, such as complex reusable queries or a meaningful testing/persistence boundary.

Do not create repository wrappers that merely duplicate every Prisma method.

---

## 14. Tenant-Scoped Data Access

Every tenant-owned operation must apply organization scope.

For example:

```ts
where: {
  organizationId,
  id,
}
```

For lists:

```ts
where: {
  organizationId,
  status,
}
```

For reports:

```ts
where: {
  organizationId,
  createdAt: {
    gte: from,
    lte: to,
  },
}
```

This applies to reads, updates, deletes, exports, searches, and bulk operations.

---

## 15. Service Method Pattern

A useful pattern is:

```ts
service.method(authContext, dto)
```

Example:

```ts
createComplaint(
  auth: AuthContext,
  dto: CreateComplaintDto,
)
```

The service obtains:

```ts
auth.userId
auth.organizationId
auth.permissions
```

from trusted server context.

The DTO contains business input, not authorization context.

---

## 16. Database Transactions

Use Prisma transactions when multiple database changes form one business operation.

### Leave approval

```text
Update leave request
+
Create approval action
+
Update leave balance
+
Create activity
```

### Asset transfer

```text
Update asset assignment
+
Create asset history
```

### Notice publishing

```text
Update notice status
+
Create notification records
```

Not every operation needs a transaction.

Avoid unnecessary transactions around simple reads/writes.

---

## 17. Transaction Boundary

A transaction should represent one business operation.

```ts
await prisma.$transaction(async (tx) => {
  // related state changes
});
```

Avoid keeping external HTTP calls, email calls, or long file operations inside a database transaction.

External side effects should be coordinated separately.

---

## 18. External Provider Abstractions

External services should not be tightly coupled to business modules.

Examples:

```text
EmailProvider
FileStorageProvider
NotificationProvider
```

Business code should depend on an internal interface.

Example:

```ts
interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
```

This makes provider changes safer later.

---

## 19. Notification Architecture

Business modules should create notification intent rather than directly calling provider SDKs.

```text
LeaveService
   ↓
NotificationService
   ↓
Notification record
   ↓
Email / Push provider
```

The original product requirements identify **Email and Push** as notification channels. SMS and WhatsApp are optional/future capabilities.

---

## 20. File Storage Architecture

Use a storage abstraction:

```text
FileService
    ↓
FileStorageProvider
    ↓
Local Storage
```

Later:

```text
FileService
    ↓
FileStorageProvider
    ↓
Cloud Object Storage
```

Business modules store file metadata/references rather than depending directly on filesystem paths.

---

## 21. File Upload Flow

```text
Client
  ↓
Authenticated upload request
  ↓
Permission check
  ↓
Tenant/resource authorization
  ↓
Validate file
  ↓
FileService
  ↓
Storage Provider
  ↓
File metadata persisted
```

Controls should include:

- size limits
- allowed MIME types
- generated storage keys
- tenant-aware storage keys
- authorization on download
- safe filename handling
- no executable uploads

---

## 22. Complaint Module

The complaint module owns:

```text
ComplaintCategory
Complaint
ComplaintAssignment
ComplaintComment
ComplaintAttachment
ComplaintStatusHistory
```

Typical service responsibilities:

```text
createComplaint()
assignComplaint()
updateComplaint()
addComment()
addAttachment()
changeStatus()
closeComplaint()
listComplaints()
getComplaint()
```

The module owns complaint state and transitions.

---

## 23. Leave Module

The leave module owns:

```text
LeaveType
LeaveBalance
LeaveRequest
```

Typical flow:

```text
Employee
  ↓
Create leave request
  ↓
Pending approval
  ↓
Approver reviews
  ↓
Approved / Rejected
  ↓
Balance/state updated
  ↓
Notification
```

Approval orchestration can use the shared approval module where required.

---

## 24. Visitor Module

The visitor domain owns:

```text
Visitor
Visit
```

Operational flow:

```text
Visitor arrives
      ↓
Receptionist creates/checks visitor
      ↓
Visit created
      ↓
Check-in
      ↓
Host/visit tracking
      ↓
Check-out
```

All visitor data remains tenant-scoped.

---

## 25. Notice Module

Notice lifecycle:

```text
Draft
  ↓
Audience selected
  ↓
Attachment/schedule
  ↓
Publish
  ↓
Read/Acknowledge
  ↓
Archive
```

The notice module owns notice state.

Notification delivery belongs to the notification subsystem.

---

## 26. Asset Module

Asset operations include:

```text
Create
Assign
Transfer
Maintain
Return
Retire
```

The module owns:

```text
Asset
AssetCategory
AssetAssignment
AssetMaintenance
AssetHistory
```

QR/barcode support remains a capability around the asset domain.

---

## 27. Document Module

The document module handles:

```text
DocumentTemplate
GeneratedDocument
File metadata/storage references
```

Flow:

```text
Template
  ↓
Select record/context
  ↓
Resolve placeholders
  ↓
Generate document
  ↓
Render PDF
  ↓
Store file
  ↓
Return controlled download access
```

Document rendering should be isolated behind a service/provider boundary.

---

## 28. Approval Module

Approval is a reusable capability.

```text
Business Module
      ↓
Approval Request
      ↓
Approval Workflow
      ↓
Approval Steps
      ↓
Approval Actions
```

The approval module does not own the underlying business object.

For example, `LeaveRequest` remains owned by Leave.

---

## 29. Event Module

The event module manages:

```text
Venue
Event
EventParticipant
```

Typical lifecycle:

```text
Draft
 ↓
Scheduled
 ↓
Completed
 ↓
Archived
```

Event reminders are delegated to notifications.

---

## 30. Reports Module

Reports should be organized by domain initially:

```text
ComplaintReportsService
LeaveReportsService
VisitorReportsService
AssetReportsService
DocumentReportsService
ApprovalReportsService
EventReportsService
```

Every report must apply tenant and permission scope.

Exports can support:

```text
CSV
Excel
PDF
```

as required by product scope.

---

## 31. Dashboard Module

Dashboards are read-oriented compositions of existing domain data.

Example School Admin dashboard:

```text
Open complaints
Pending leave
Visitor activity
Asset count
Upcoming events
Recent notices
```

Example Principal dashboard:

```text
Operational overview
Pending approvals
Complaint trends
Leave trends
Upcoming events
```

Dashboard logic should reuse domain query services where possible.

---

## 32. Audit Module

Audit logging should be centralized.

Example:

```ts
auditService.record(...)
```

Important actions include:

```text
CREATE
UPDATE
DELETE
APPROVE
REJECT
PUBLISH
ASSIGN
TRANSFER
RETIRE
LOGIN
LOGOUT
ROLE_CHANGED
```

Audit records should be protected from ordinary user modification.

---

## 33. Activity Module

Activity history is different from security audit.

**Audit** answers:

> What security/business action occurred, and who performed it?

**Activity** answers:

> What happened recently in this operational workflow?

Example complaint activity:

```text
Complaint created
Assigned to maintenance staff
Comment added
Status changed to IN_PROGRESS
Status changed to COMPLETED
```

Keep the two concepts separate.

---

## 34. Error Handling

Use consistent HTTP error categories:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Business validation where appropriate
429 Too Many Requests
500 Internal Server Error
```

Production responses must not expose stack traces or raw database errors.

---

## 35. Business Exceptions

Domain services should throw meaningful application exceptions.

Examples:

```text
ComplaintStatusTransitionException
LeaveBalanceInsufficientException
ApprovalAlreadyCompletedException
AssetAlreadyRetiredException
VisitorAlreadyCheckedOutException
```

These can map to stable HTTP error codes.

---

## 36. API Response Strategy

A practical success envelope is:

```json
{
  "data": {},
  "meta": {}
}
```

For errors:

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "You do not have permission to perform this action."
}
```

The exact envelope should be standardized before frontend implementation.

---

## 37. Pagination

List APIs should support pagination.

Example:

```text
GET /complaints?page=1&limit=20
```

Enforce safe limits, for example:

```text
limit <= 100
```

with the exact maximum configurable.

---

## 38. Filtering and Sorting

Allow domain-relevant filters.

Example:

```text
GET /complaints
  ?status=OPEN
  &priority=HIGH
  &categoryId=...
  &page=1
  &limit=20
```

Sorting fields must be allow-listed.

Never accept arbitrary SQL/order expressions from clients.

---

## 39. Search

Search should initially be implemented per domain.

Examples:

```text
Student name / admission number
Staff name / employee code
Visitor mobile/name
Asset code/serial number
Complaint title/reference
```

PostgreSQL indexes and normal queries should be sufficient for the MVP.

---

## 40. Background Processing

Do not introduce queue infrastructure unless a real asynchronous workload requires it.

Potential future jobs:

```text
Email delivery
Push notification delivery
Scheduled notices
Event reminders
PDF generation
Large report exports
Preventive maintenance reminders
```

Lightweight scheduling can handle simple jobs initially.

If workload grows, BullMQ + Redis can be introduced later.

---

## 41. Scheduled Tasks

Potential scheduled tasks:

```text
Upcoming event reminders
Scheduled notice publishing
Leave reminders
Maintenance reminders
Cleanup tasks
```

Jobs must be:

- idempotent
- tenant-aware
- observable
- safe to retry

Avoid duplicate notifications if a job runs more than once.

---

## 42. Idempotency

Operations that can be retried need idempotency considerations.

Examples:

```text
Notification delivery
Document generation
Scheduled publishing
External provider callbacks
Future financial operations
```

For state transitions, validate the current state before applying the transition.

---

## 43. Concurrency

Concurrency matters for:

```text
Leave approval
Asset assignment
Complaint assignment
Notice publishing
Approval actions
```

Use transactions and conditional state updates where multiple users could modify the same record.

Two users should not accidentally complete the same one-time transition.

---

## 44. Configuration Management

Centralize configuration.

Typical values:

```text
NODE_ENV
PORT
DATABASE_URL

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_TTL
JWT_REFRESH_TTL

FRONTEND_URL

EMAIL_PROVIDER
EMAIL_FROM

FILE_STORAGE_PROVIDER
LOCAL_UPLOAD_DIR
```

Provider-specific credentials should be environment-managed.

---

## 45. Logging

Use structured application logs.

Useful fields:

```text
timestamp
level
requestId
userId where appropriate
organizationId where appropriate
module
action
duration
error code
```

Never log:

```text
passwords
JWTs
refresh tokens
API keys
sensitive document contents
```

---

## 46. Request Correlation

Assign a request ID to incoming requests.

```text
HTTP Request
    ↓
requestId
    ↓
controller
    ↓
service
    ↓
database/provider logs
```

This makes individual operations traceable.

---

## 47. Health Checks

Provide:

```text
GET /health
```

Where useful, distinguish:

```text
Liveness
Application process is running

Readiness
Application can reach required dependencies
```

Database connectivity can be part of readiness.

---

## 48. Graceful Shutdown

NestJS should support graceful shutdown:

```text
Receive termination signal
       ↓
Stop accepting new requests
       ↓
Finish in-flight work
       ↓
Close database connection
       ↓
Close other resources
       ↓
Exit
```

This is important for container deployments.

---

## 49. API Documentation

Use OpenAPI/Swagger during development.

Document:

- endpoints
- DTOs
- authentication
- response structures
- errors
- enums

The complete API contract will later be captured in `11-API-CONTRACT.md`.

---

## 50. Security Middleware

The backend should include appropriate controls for:

```text
HTTP security headers
CORS
rate limiting
request size limits
validation
authentication
authorization
```

The exact stack should match the deployment environment.

---

## 51. API Versioning

A simple strategy is recommended:

```text
/api/v1/...
```

Version when breaking API changes are required.

Do not create unnecessary versions for internal changes.

---

## 52. Dependency Direction

Prefer:

```text
HTTP / Controllers
       ↓
Application / Domain Services
       ↓
Persistence / Infrastructure
```

Shared infrastructure should not import business modules.

For example, notification infrastructure should not depend on a complaint controller.

---

## 53. Avoid Circular Dependencies

Avoid:

```text
ComplaintModule → NotificationModule
NotificationModule → ComplaintModule
```

Prefer:

```text
ComplaintModule
      ↓
NotificationService abstraction
      ↓
NotificationModule
```

If workflows become tightly coupled, consider an application event or orchestration service.

---

## 54. Domain Events — Optional Evolution

The architecture can later support internal domain events.

Example:

```text
ComplaintCompleted
      ↓
Notification Handler
      ↓
Send notification
```

or:

```text
LeaveApproved
      ↓
Notification
      ↓
Audit
```

Do not introduce a distributed event bus for the MVP.

---

## 55. Testing Architecture

Use multiple testing levels.

### Unit Tests

```text
domain rules
status transitions
permission policies
utility functions
```

### Integration Tests

```text
NestJS service + Prisma/PostgreSQL
tenant filtering
transactions
```

### API/E2E Tests

```text
login
authorization
tenant isolation
CRUD flows
approval flows
file access
```

Security tests should specifically attempt cross-tenant access.

---

## 56. Highest-Value Backend Tests

Prioritize:

```text
Authentication
RBAC
Tenant isolation
Complaint lifecycle
Leave approval
Asset transfer
Notice publishing
Document authorization
Approval workflow
```

These protect important business and security invariants.

---

## 57. Deployment Shape

Initial deployment can be:

```text
                    Internet
                       │
                       ▼
              ┌────────────────┐
              │ Next.js        │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │ NestJS API     │
              └───────┬────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   PostgreSQL                 File Storage
```

A separate worker should only be introduced when background processing justifies it.

---

## 58. Cost-Conscious Architecture

For the first release, avoid:

```text
Microservices
Kafka
Kubernetes
Multiple databases
Dedicated identity server
Redis without a real use case
Complex workflow engine
Dedicated search cluster
```

Prefer:

```text
One NestJS service
One PostgreSQL database
Prisma
One frontend
Simple storage abstraction
Provider abstractions
Optional scheduler
```

---

## 59. Evolution Path

```text
Phase 1
Modular Monolith
    ↓
Phase 2
Queue + Redis if needed
    ↓
Phase 3
Object storage
    ↓
Phase 4
Dedicated workers for heavy jobs
    ↓
Phase 5
Extract services only where justified
```

Do not start with Phase 5.

---

## 60. Recommended Module Dependency Map

```text
Auth
  └── Users / Organizations / Roles / Permissions

Students
  └── Departments

Staff
  └── Departments

Complaints
  ├── Staff
  ├── Files
  ├── Notifications
  └── Audit/Activity

Leave
  ├── Staff
  ├── Approvals
  ├── Notifications
  └── Audit/Activity

Visitors
  ├── Staff
  ├── Files
  ├── Notifications
  └── Audit/Activity

Notices
  ├── Files
  ├── Notifications
  └── Audit/Activity

Assets
  ├── Staff
  ├── Files
  └── Audit/Activity

Documents
  ├── Students / Staff
  ├── Files
  └── Audit

Approvals
  ├── Notifications
  └── Audit

Events
  ├── Venues
  ├── Notifications
  └── Audit

Reports
  └── Read-only domain queries
```

Dependencies should be one-directional wherever practical.

---

## 61. Backend Coding Standards

Recommended standards:

- TypeScript strict mode
- Explicit DTOs
- Avoid `any`
- Small focused services
- Consistent naming
- No direct database access from controllers
- No client-controlled tenant authorization
- No secrets in source code
- No business logic in DTOs
- Reusable guards/decorators for authorization
- Centralized error handling
- Structured logging
- Tests for important domain rules

---

## 62. Definition of Done for a Backend Module

A module should not be considered complete merely because CRUD endpoints work.

- [ ] NestJS module created
- [ ] Controller defined
- [ ] DTO validation added
- [ ] Service/domain logic implemented
- [ ] Authorization rules defined
- [ ] Tenant isolation enforced
- [ ] Prisma queries indexed appropriately
- [ ] Transactions used where required
- [ ] Audit/activity events added where required
- [ ] Notifications integrated where required
- [ ] Error cases handled
- [ ] Pagination/filtering implemented where required
- [ ] Tests added
- [ ] Swagger/OpenAPI documented
- [ ] Logging added for important failures

---

## 63. Recommended Implementation Order

### Phase 1 — Foundation

```text
Configuration
Database
Prisma
Common errors
Logging
Health
Auth
Organizations
Users
Roles
Permissions
```

### Phase 2 — Core Operations

```text
Students
Staff
Departments
Complaints
Leave
Notices
Notifications
```

### Phase 3 — Operational Management

```text
Visitors
Assets
Files
Documents
```

### Phase 4 — Workflow & Insights

```text
Approvals
Events
Reports
Dashboards
Audit/Activity refinement
```

---

## 64. Backend Boundary

The backend is responsible for:

```text
Authentication
Authorization
Tenant isolation
Validation
Business rules
Persistence
Transactions
File authorization
Notification orchestration
Auditability
API contract
Operational reliability
```

The frontend is responsible for presentation and user experience.

The backend must remain secure even if the frontend is completely bypassed.

---

## 65. Final Architecture

```text
                   ┌──────────────────────┐
                   │      Next.js         │
                   └──────────┬───────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────┐
│                     NestJS API                         │
│                                                        │
│  Auth / RBAC / Tenant Context                          │
│                 ↓                                      │
│  Controllers + DTO Validation                          │
│                 ↓                                      │
│  Domain/Application Services                           │
│                 ↓                                      │
│  ┌────────────┬────────────┬───────────────┐           │
│  │ Complaints │ Leave      │ Notices       │           │
│  │ Visitors   │ Assets     │ Documents     │           │
│  │ Approvals  │ Events     │ Students/Staff│           │
│  └────────────┴────────────┴───────────────┘           │
│                 ↓                                      │
│  Shared Services                                       │
│  Notifications / Files / Reports / Audit               │
│                 ↓                                      │
│  Prisma                                                │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
                  PostgreSQL
```

This gives CampusOps a strong foundation without unnecessary distributed-system complexity.

---

## 66. Summary

The backend should be built as a **modular monolith with strong domain boundaries**.

The key rule is:

> **Keep business modules independent, keep controllers thin, enforce authorization before business operations, and enforce tenant isolation in every persistence operation.**

This allows CampusOps to evolve from a simple deployment into a larger architecture without forcing unnecessary complexity into the first release.

---

**Next document:** `06-FRONTEND-ARCHITECTURE.md`
