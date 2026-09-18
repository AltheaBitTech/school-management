# CampusOps — Approval Workflow Architecture & Implementation Specification

**Document:** 17-APPROVAL-WORKFLOW.md  
**Phase:** 11 — Approval Workflow  
**Status:** Authoritative implementation specification  
**Scope:** Approval foundation + Leave Approval integration  
**Stack:** NestJS + Prisma + PostgreSQL + Next.js  
**Architecture:** Multi-tenant modular monolith

## 1. Purpose

CampusOps needs a reusable approval capability for Staff Leave, Purchase, Budget, Asset Purchase, and Maintenance.

**Architecture rule:** Business modules own business state. The Approval module owns approval workflow state.

Leave owns `LeaveRequest`, dates, balances and leave business rules. Approval owns workflow definitions, levels, approval requests, approver decisions and approval history.

## 2. Phase boundaries

### 11A — Approval Foundation

Implement:
- ApprovalWorkflow
- ApprovalLevel
- ApprovalRequest
- ApprovalAction/history
- state machine
- approver resolution
- tenant isolation
- RBAC
- transactional approval progression
- concurrency protection
- APIs and tests

### 11B — Leave Approval Integration

Integrate the existing Leave module with the approval foundation:
- submit LeaveRequest into approval
- associate approval request
- approve/reject
- multi-level progression
- final approval → existing Leave finalization
- rejection → Leave rejection
- transaction/concurrency safety
- minimal frontend approval experience

### Explicit non-goals

Do **not** implement Purchase, Budget, Asset Purchase, Maintenance approvals, notifications, reminders, delegation, escalation, SLA, Redis/BullMQ, Kafka, microservices, workflow designer, scripting, external workflow engines, signatures, mobile approval, or unrelated refactors.

## 3. Domain ownership

### Approval owns
- workflow definitions
- ordered levels
- approval requests
- current level/status
- approval actions/history
- approver decisions

### Leave owns
- LeaveRequest
- leave dates/type/half-day
- overlap validation
- leave balance
- leave business status
- balance consumption/refund
- leave-specific validation

Approval must not directly modify leave balances except through a clean Leave-owned finalization boundary.

## 4. Core models

### ApprovalWorkflow

Fields:
- `id`
- `organizationId`
- `code`
- `name`
- `description` nullable
- `entityType`
- `isActive`
- `createdAt`
- `updatedAt`

Constraint: `(organizationId, code)` unique.

For this phase Leave uses `entityType = LEAVE`.

Inactive workflows cannot accept new requests.

### ApprovalLevel

Fields:
- `id`
- `workflowId`
- `level`
- `name`
- `approverType`
- `roleId` nullable
- `userId` nullable
- `createdAt`
- `updatedAt`

Constraint: `(workflowId, level)` unique.

Initial approver types:
- `ROLE`
- `USER`

Levels are sequential and start at 1. Do not implement dynamic expressions.

### ApprovalRequest

Fields:
- `id`
- `organizationId`
- `workflowId`
- `entityType`
- `entityId`
- `status`
- `currentLevel`
- `submittedById`
- `completedAt` nullable
- `createdAt`
- `updatedAt`

Statuses:
- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

`entityId` is polymorphic; do not create fake polymorphic FKs. Business modules validate their entity.

Only one active approval request should exist for an entity where required by the integration.

### ApprovalAction

Append-only history:
- `id`
- `approvalRequestId`
- `level`
- `action`
- `actorUserId`
- `comment` nullable
- `createdAt`

Actions:
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

Never rewrite historical actions.

## 5. State machine

Lifecycle:

```text
SUBMITTED → PENDING
PENDING → PENDING      (approve level, more levels remain)
PENDING → APPROVED     (final level approved)
PENDING → REJECTED
PENDING → CANCELLED    (only when business integration permits)
```

Terminal states cannot transition.

Never allow APPROVED/REJECTED/CANCELLED back to PENDING or another terminal state.

## 6. Multi-level approval

Example:

```text
LEAVE_APPROVAL
  Level 1 → Principal
  Level 2 → School Admin
```

Submission creates `PENDING/currentLevel=1`.

Level 1 approval advances to level 2. Only the final level changes the ApprovalRequest to `APPROVED`.

## 7. Approver resolution

### ROLE

Resolve an active user who:
- belongs to the same organization
- has the configured role
- is active

### USER

Verify the configured user:
- exists
- belongs to the same organization
- is active

Never trust client-supplied organization ID, approver identity or role.

The authenticated user comes from the JWT.

## 8. Self approval

Default rule:

> A requester cannot approve their own business request.

Enforce server-side. Do not make it configurable in this phase.

## 9. Transaction and concurrency rules

Approve/reject must:
1. start a DB transaction
2. lock the ApprovalRequest row
3. re-read status/currentLevel
4. verify it is still `PENDING`
5. verify actor tenant membership
6. resolve current approver
7. verify authorization
8. reject self-approval
9. append history
10. advance level or finalize
11. commit

Reject follows the same locking/validation pattern and sets `REJECTED/completedAt`.

Use PostgreSQL row locking / the established Prisma transaction pattern already used in Leave, Complaint, Visitor and Asset.

Concurrent operations must not cause duplicate approval, skipped levels, approval after rejection, duplicate finalization, or double leave-balance consumption.

## 10. Leave integration

Inspect the current Leave implementation first and adapt it minimally.

Conceptually:

```text
LeaveRequest
   ↓
ApprovalRequest(PENDING, level 1)
   ↓
level 1 approval
   ↓
next level if configured
   ↓
ApprovalRequest(APPROVED)
   ↓
Leave-owned finalization
   ↓
consume balance exactly once
```

Intermediate approvals do not consume balance.

Rejection does not consume balance.

Final approval consumes balance exactly once.

Preserve existing Leave validation:
- leave type
- dates
- half-day
- overlap
- sufficient balance
- self-approval
- tenant isolation
- existing locking

Do not duplicate Leave business logic inside Approval.

## 11. Permissions

Approval permissions:

```text
approval.view
approval.submit
approval.approve
approval.reject
approval.cancel
approval.configure
```

Existing Leave permissions remain:

```text
leave.view
leave.create
leave.approve
leave.reject
leave.configure_types
leave.manage_balances
```

Inspect existing RBAC conventions before assigning permissions to system roles.

## 12. API surface

Approval requests:

```http
GET  /api/v1/approvals
GET  /api/v1/approvals/:id
GET  /api/v1/approvals/:id/history
POST /api/v1/approvals/:id/approve
POST /api/v1/approvals/:id/reject
```

Workflow administration:

```http
GET   /api/v1/approval-workflows
POST  /api/v1/approval-workflows
GET   /api/v1/approval-workflows/:id
PATCH /api/v1/approval-workflows/:id
```

Follow existing pagination, DTO, response and exception conventions.

## 13. Error contract

Use stable codes such as:

```text
APPROVAL_NOT_FOUND
APPROVAL_ALREADY_COMPLETED
APPROVAL_NOT_PENDING
APPROVAL_NOT_AUTHORIZED
APPROVAL_SELF_APPROVAL
APPROVAL_WORKFLOW_NOT_FOUND
APPROVAL_WORKFLOW_INACTIVE
APPROVAL_LEVEL_NOT_CONFIGURED
APPROVAL_INVALID_TRANSITION
APPROVAL_ENTITY_NOT_FOUND
APPROVAL_CROSS_TENANT
```

Never leak raw Prisma/database errors.

## 14. Frontend

Implement only the proof-of-workflow UI:

```text
/approvals
/approvals/[id]
```

List:
- pending approvals
- status
- entity type
- basic filters if consistent with existing patterns

Detail:
- request summary
- current level
- approver state
- history
- approve
- reject
- optional comment

Integrate Leave approval state/actions into existing Leave UI only where needed.

Do not build a workflow designer.

## 15. Database integrity

Use:
- tenant-scoped indexes
- `(organizationId, code)` workflow uniqueness
- `(workflowId, level)` uniqueness
- indexes supporting approval list/status/current-level queries
- concrete FKs for Approval-owned relationships

Do not create fake polymorphic FKs for `entityId`.

## 16. Auditability

Approval history is distinct from global AuditLog.

Approval history records approval business events. Global AuditLog remains responsible for the existing audit/security architecture.

Do not duplicate events unnecessarily.

## 17. Seed and existing tenants

New organization bootstrap should have a usable default Leave approval workflow.

Existing organizations must be handled explicitly. If a backfill is needed:
- make it idempotent
- scope it correctly
- document execution
- avoid duplicates

Do not assume migration-time seeding updates existing tenants.

## 18. Testing

### Unit
Cover:
- valid/invalid transitions
- ROLE approver resolution
- USER approver resolution
- self approval
- level progression
- final approval
- rejection
- inactive workflow
- missing level

### Integration
Cover:
- tenant isolation
- cross-tenant access
- RBAC
- unauthorized approve/reject
- concurrent approve
- concurrent approve/reject
- duplicate action prevention
- multi-level progression
- final Leave integration
- intermediate approval does not consume balance
- rejection does not consume balance
- final approval consumes balance exactly once

### Frontend
Cover:
- approval list/detail
- approve/reject
- loading/error states
- permission-aware actions where consistent with current app patterns

## 19. Migration

Create a new Prisma migration. Never edit historical migrations or reset the DB.

Only modify Leave schema if genuinely required for integration. If adding `approvalRequestId`, choose relationship/uniqueness semantics carefully and document why.

## 20. Security checklist

Before completion verify:
- [ ] organization comes from authenticated user
- [ ] every approval query is tenant scoped
- [ ] workflow ownership is tenant scoped
- [ ] approver resolution is tenant scoped
- [ ] requester cannot approve own request
- [ ] approve/reject permissions are server enforced
- [ ] inactive workflows cannot create requests
- [ ] terminal states cannot transition
- [ ] concurrent actions are serialized
- [ ] raw DB errors do not leak
- [ ] client cannot choose approver identity
- [ ] client cannot choose organization

## 21. Implementation sequence

1. Prisma models + migration
2. enums/constants
3. workflow configuration service
4. approver resolution
5. approval request service
6. transactional approve/reject state machine
7. RBAC
8. APIs
9. Leave integration
10. frontend
11. tests
12. hardening review
13. verification
14. commit/push only after explicit approval

## 22. Architectural rules

1. Read existing docs and implementation before changes.
2. Reuse existing transaction, locking, RBAC, error, pagination and tenant patterns.
3. Do not create duplicate infrastructure.
4. Do not introduce Redis/BullMQ/Kafka/microservices.
5. Do not build a workflow engine.
6. Do not redesign Leave.
7. Keep Approval reusable but intentionally small.
8. Backend is the security boundary.
9. Prefer explicit code over generic magic.
10. If an ambiguity materially affects correctness, stop and report it rather than guessing.
11. Do not commit/push without explicit instruction.

## 23. Definition of done

Complete only when:
- schema/migration works
- workflow configuration works
- approval requests work
- ROLE/USER approvers work
- multi-level progression works
- approve/reject is transactional
- Leave integration works
- final approval consumes balance exactly once
- rejection/intermediate approval do not consume balance
- tenant isolation and RBAC pass
- concurrency tests pass
- API/frontend tests pass
- typecheck/lint/build pass
- migration status is clean
- `git diff --check` passes
- hardening review has no unresolved blocking findings
