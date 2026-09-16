# 14 — Visitor Management

**Project:** CampusOps / School Operations Management SaaS  
**Phase:** 8  
**Status:** Design locked for implementation

## 1. Purpose

Visitor Management lets school reception and authorized staff register visitors, record check-in/check-out, identify the host, and retrieve visit history.

CampusOps complements the existing School ERP; this module does not replace academic/student management.

## 2. Phase 8 MVP Boundary

### Included
- Visitor registration and check-in
- Visitor details: name, mobile, organization, vehicle number, purpose, host, remarks
- Check-out
- Current visitor list
- Visitor history/detail
- Visitor lifecycle/status
- RBAC and tenant isolation
- Domain business history
- Validation and concurrency protection
- Backend/frontend tests

### Deferred
- Visitor photo/file upload
- Visitor-pass PDF/QR generation
- Email/push/SMS/WhatsApp notifications
- Student/parent hosts
- Pre-registration/invitations
- Appointment scheduling
- Blacklist/watchlist
- Kiosk mode
- Analytics/report exports
- ERP integration
- Redis/BullMQ/Kafka
- Separate visitor microservice

## 3. Domain Model

Each physical visit is one `Visitor` record in this MVP. Do not introduce a separate reusable VisitorPerson model yet.

Fields:
- `id`
- `organizationId`
- `visitorCode`
- `name`
- `mobile`
- `organizationName` nullable
- `vehicleNumber` nullable
- `purpose`
- `hostStaffId`
- `checkInAt`
- `checkOutAt` nullable
- `status`
- `remarks` nullable
- `createdByUserId`
- `createdAt`
- `updatedAt`

Status:
```text
CHECKED_IN
CHECKED_OUT
```

Allowed lifecycle:
```text
create → CHECKED_IN → CHECKED_OUT
```

No arbitrary status PATCH and no physical delete.

## 4. Registration / Check-in

Receptionist or authorized user registers and checks in a visitor in one operation.

Required:
- name
- mobile
- purpose
- host staff

Optional:
- organization
- vehicle number
- remarks

The backend generates `checkInAt`, `visitorCode`, `organizationId`, `createdByUserId`, and status. Never trust client-supplied values for those fields.

## 5. Host Rules

Phase 8 hosts are **Staff only**.

`hostStaffId` must reference an active staff member in the same organization.

Reject:
- another tenant's staff
- nonexistent staff
- OFFBOARDED staff
- inactive/deactivated staff

Frontend filtering is only UX; backend validation is authoritative.

## 6. Tenant Isolation

Always derive organization from authenticated JWT/request context.

Never trust client `organizationId` from body, query, route, or frontend state.

Every visitor and history query must include tenant scope. Cross-tenant IDs must behave as not found.

Host validation must also be tenant-scoped.

## 7. Visitor Code

Generate tenant-local sequential codes:

```text
VIS-000001
VIS-000002
VIS-000003
```

Requirements:
- unique within organization
- server-generated
- concurrency-safe

Use the same established complaint-code pattern: `pg_advisory_xact_lock` + sequence calculation + unique `(organizationId, visitorCode)`.

## 8. Database Design

Recommended Prisma model:

```prisma
model Visitor {
  id               String        @id @default(uuid())
  organizationId   String
  visitorCode      String
  name             String
  mobile           String
  organizationName String?
  vehicleNumber    String?
  purpose          String
  hostStaffId      String
  checkInAt        DateTime
  checkOutAt       DateTime?
  status           VisitorStatus
  remarks          String?
  createdByUserId  String
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  hostStaff       Staff         @relation("VisitorHost", fields: [hostStaffId], references: [id], onDelete: Restrict)
  createdByUser   User          @relation("VisitorCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)
  history         VisitorHistory[]

  @@unique([organizationId, visitorCode])
  @@index([organizationId, status, checkInAt])
  @@index([organizationId, hostStaffId, checkInAt])
  @@index([organizationId, mobile])
  @@index([organizationId, createdAt])
}

model VisitorHistory {
  id             String   @id @default(uuid())
  organizationId String
  visitorId      String
  eventType      VisitorHistoryEvent
  comment        String?
  actorUserId    String
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  visitor      Visitor      @relation(fields: [visitorId], references: [id], onDelete: Restrict)
  actorUser    User         @relation(fields: [actorUserId], references: [id], onDelete: Restrict)

  @@index([organizationId, visitorId, createdAt])
}
```

Enums:
```text
VisitorStatus: CHECKED_IN, CHECKED_OUT
VisitorHistoryEvent: CHECKED_IN, CHECKED_OUT
```

Use PostgreSQL timestamps consistently with the existing project.

## 9. Check-out

Endpoint must:
1. tenant-scope visitor
2. lock row with `FOR UPDATE`
3. verify status is `CHECKED_IN`
4. set server-generated `checkOutAt`
5. set status `CHECKED_OUT`
6. insert `CHECKED_OUT` history
7. commit atomically

Two concurrent check-outs: exactly one succeeds; the other receives a business-state conflict.

## 10. API Contract

Base:
```text
/api/v1/visitors
```

### GET /visitors
Permission: `visitor.view`

Filters:
- `status`
- `date`
- `fromDate`
- `toDate`
- `hostStaffId`
- `search` (name/mobile/code)
- pagination

Default useful view: `CHECKED_IN`, sorted `checkInAt DESC`.

### POST /visitors
Permission: `visitor.create`

Example:
```json
{
  "name": "Ramesh Kumar",
  "mobile": "9876543210",
  "organizationName": "ABC Services",
  "vehicleNumber": "AP39AB1234",
  "purpose": "Meeting with Principal",
  "hostStaffId": "<staff-id>",
  "remarks": "Vendor representative"
}
```

Do not accept `organizationId`, `visitorCode`, `checkInAt`, `status`, or `createdByUserId`.

### GET /visitors/:id
Permission: `visitor.view`

Returns visitor, host, status, check-in/out, and history. Cross-tenant access returns not found.

### POST /visitors/:id/check-out
Permission: `visitor.checkout`

No body. Performs transactional checkout.

### GET /visitors/:id/history
Permission: `visitor.view`

Returns tenant-scoped business history.

## 11. RBAC

Add:
```text
visitor.view
visitor.create
visitor.checkout
```

Suggested organization-role mapping:

| Role | view | create | checkout |
|---|---:|---:|---:|
| School Admin | Yes | Yes | Yes |
| Principal | Yes | Yes | Yes |
| Receptionist | Yes | Yes | Yes |
| Teacher | Yes | No | No |
| Maintenance Staff | Yes | No | No |
| Accountant | Yes | No | No |

Follow existing RBAC architecture; do not create a new authorization mechanism.

## 12. Frontend

Routes:
```text
/visitors
/visitors/new
/visitors/[id]
```

### List
Show code, name, mobile, purpose, host, check-in, check-out, status, actions.

Filters:
- Current / Checked In
- Checked Out
- Date
- Host
- Search

### Register
Fields:
```text
Visitor Name *
Mobile *
Organization
Vehicle Number
Purpose *
Host Staff *
Remarks
```

Primary action: `Register & Check In`.

### Detail
Sections:
- Visitor Information
- Visit Information
- Actions
- History

Only `CHECKED_IN` visitors show `Check Out`.

Use loading, empty, error, 403, 404, success, and 409 states. Confirm before checkout.

## 13. Validation

Backend validation:
- name required, trimmed, bounded
- mobile required and consistent with existing application validation conventions
- purpose required, trimmed, bounded
- host required UUID and active same-tenant staff
- optional vehicle/organization/remarks trimmed and bounded

Do not add speculative business rules.

## 14. History vs AuditLog

`VisitorHistory` is domain history only:
- CHECKED_IN
- CHECKED_OUT

Do not build the generic platform `AuditLog` module in Phase 8.

History writes must occur in the same transaction as the visitor mutation.

## 15. Error Semantics

Follow existing project conventions. Recommended codes:
```text
VISITOR_NOT_FOUND
VISITOR_ALREADY_CHECKED_OUT
VISITOR_HOST_INVALID
VISITOR_HOST_OFFBOARDED
VISITOR_HOST_INACTIVE
VISITOR_CHECKOUT_CONFLICT
```

Never expose database errors. Cross-tenant records use normal not-found behavior.

## 16. Testing

### Backend
Cover:
- creation/check-in
- generated code and timestamp
- history creation
- active same-tenant host
- cross-tenant/offboarded/inactive host rejection
- detail tenant isolation
- checkout
- repeated checkout rejection
- concurrent checkout (exactly one success)
- RBAC for view/create/checkout
- list/detail/history tenant isolation

### Frontend
Cover:
- list loading/empty/rendering
- filters
- registration validation/success
- detail/history
- checkout
- 403/404
- checkout conflict

## 17. Security Checklist

- authentication on every endpoint
- permission guard on every endpoint
- tenant scope on every query
- no trusted client organizationId
- cross-tenant visitor IDs return 404
- host tenant/status validation
- server-generated code and timestamps
- checkout row locking
- transactional history
- no physical delete
- controlled validation/errors
- no sensitive leakage

## 18. Implementation Sequence

```text
1. Review Phase 0–7 conventions
2. Prisma Visitor + VisitorHistory
3. Migration
4. Enums/constants/DTOs
5. Visitor service
6. Tenant-scoped queries
7. Visitor-code generation
8. Create/check-in
9. Detail/history
10. Checkout transaction + locking
11. RBAC permissions
12. Backend tests
13. Frontend client
14. Visitor list
15. Registration form
16. Detail/history
17. Checkout UX
18. Frontend tests
19. Full verification
20. Security/hardening review
```

## 19. Explicit Non-Goals

Do not introduce Redis, BullMQ, Kafka, microservices, notification workers, file storage, PDF/QR generation, student/parent domain, appointment engine, calendar integration, blacklist engine, AI, analytics platform, or generic workflow engine.

## 20. Definition of Done

Database, backend, frontend, tenant isolation, RBAC, lifecycle rules, checkout concurrency protection, history, and tests must all be complete.

Verification:
```bash
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm test
RUN_DB_TESTS=true pnpm test
pnpm build
pnpm prisma migrate status
git diff --check
```

No commit until verification passes and a separate hardening review says READY TO COMMIT.
