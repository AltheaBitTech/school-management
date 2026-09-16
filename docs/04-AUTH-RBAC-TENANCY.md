# CampusOps — Authentication, RBAC & Multi-Tenancy

**Document:** 04-AUTH-RBAC-TENANCY.md  
**Product:** School Operations Management SaaS / CampusOps  
**Status:** Architecture specification  
**Previous:** 03-DATABASE-ARCHITECTURE.md  
**Next:** 05-BACKEND-ARCHITECTURE.md

---

## 1. Purpose

This document defines how CampusOps authenticates users, determines what they are allowed to do, and guarantees that one school's data cannot be accessed by another school.

The design is intentionally suitable for a **cost-conscious NestJS + Prisma + PostgreSQL modular monolith**.

The three security concerns are treated separately:

1. **Authentication** — Who is this user?
2. **Authorization** — What may this user do?
3. **Tenant isolation** — Which school's data may this user access?

Authentication alone is never considered sufficient authorization.

---

## 2. Security Principles

CampusOps follows these rules:

- The backend is the final security boundary.
- Never trust `organizationId` supplied by the browser for authorization.
- Tenant context must come from the authenticated identity and/or trusted server-side context.
- Every tenant-owned database query must be tenant-scoped.
- Role checks happen on the backend.
- Permission checks are preferred over hard-coding role names throughout business logic.
- Resource ownership and relationship checks are required where role-level access is not enough.
- A user from Organization A must never be able to read, update, delete, or download Organization B's records.
- Protected files follow the same authorization rules as protected database records.
- Disabled users cannot continue accessing the application.
- Authentication and authorization failures should not leak unnecessary information.
- Security-sensitive actions should be auditable.

---

# 3. Identity Model

The database architecture defines `User` as the application identity and associates users with organizations and roles.

Conceptually:

```text
User
 ├── Organization membership
 ├── Role assignments
 └── Authentication credentials/session state

Organization
 ├── Users
 ├── Departments
 ├── Students
 ├── Staff
 ├── Complaints
 ├── Leave
 ├── Visitors
 ├── Notices
 ├── Assets
 ├── Documents
 ├── Approvals
 └── Events
```

For the initial SaaS model, a user should operate within an explicit organization context.

If multi-organization membership is introduced later, the selected organization must still be validated against the user's actual memberships.

---

# 4. Authentication Lifecycle

## 4.1 Registration / School Onboarding

School onboarding should create the organization and its initial administrative identity through a controlled server-side flow.

Typical flow:

```text
Registration / Onboarding
        ↓
Validate input
        ↓
Create Organization
        ↓
Create initial User
        ↓
Assign School Admin role
        ↓
Create default settings / roles if required
        ↓
Create audit event
        ↓
Verification / activation
        ↓
Login
```

The exact public onboarding experience may evolve, but organization creation must never allow a caller to choose arbitrary internal security values.

The client must not be able to:

- assign itself SaaS Super Admin,
- grant arbitrary permissions,
- choose another organization's ID,
- bypass account activation,
- create users in another organization.

---

# 5. Login

The login flow should be:

```text
Client
  ↓
POST /auth/login
  ↓
Validate credentials
  ↓
Check account status
  ↓
Resolve organization membership
  ↓
Issue access + refresh credentials
  ↓
Return authenticated session
```

At minimum, authentication should validate:

- identifier (normally email/username as implemented),
- password,
- account enabled/disabled state,
- organization membership where applicable.

Failed login responses should avoid revealing whether a particular account exists.

---

# 6. Password Security

Passwords must never be stored in plaintext.

Use a modern password hashing algorithm such as:

- Argon2id, or
- bcrypt with an appropriately strong cost.

The selected implementation should be encapsulated behind an authentication/password service rather than scattered across controllers.

Password requirements should be reasonable and enforceable, without relying on client-side validation alone.

Never log:

- plaintext passwords,
- password hashes,
- authentication secrets,
- access tokens,
- refresh tokens.

---

# 7. Access Token Strategy

CampusOps can use short-lived JWT access tokens for API authentication.

Conceptual access token claims:

```json
{
  "sub": "user-id",
  "organizationId": "organization-id",
  "sessionId": "session-id",
  "roles": ["SCHOOL_ADMIN"]
}
```

Only include claims that are actually required by the authorization layer.

Important rule:

> JWT claims are authentication context, not a replacement for database authorization.

For sensitive operations, the backend should still validate current account status, organization membership, roles, permissions, and resource relationships as appropriate.

### Recommended initial lifetime

A short access-token lifetime is preferred, for example:

```text
Access token: ~15 minutes
```

The exact TTL should be configurable through environment configuration.

---

# 8. Refresh Token Strategy

Refresh tokens should provide longer-lived sessions without making access tokens long-lived.

Recommended lifecycle:

```text
Login
  ↓
Access Token + Refresh Token
  ↓
Access token expires
  ↓
Refresh request
  ↓
Validate refresh token
  ↓
Rotate refresh token
  ↓
Issue new access token
  ↓
Invalidate previous refresh token
```

Refresh tokens should be:

- high entropy,
- stored securely,
- associated with a session/token record where practical,
- rotated on refresh,
- revocable on logout,
- invalidated after suspicious reuse.

For a browser application, prefer secure, `HttpOnly`, `Secure` cookies for refresh credentials rather than exposing long-lived refresh tokens to JavaScript.

The exact cookie policy should also account for the deployment domain and CSRF strategy.

---

# 9. Logout

Logout should invalidate the active refresh session/token.

Conceptually:

```text
POST /auth/logout
        ↓
Authenticate session
        ↓
Revoke refresh session
        ↓
Clear client-side authentication state
```

Because access tokens are short-lived, immediate server-side invalidation of every already-issued access JWT is not required for the initial implementation.

For higher-risk events such as password reset, account disablement, or suspected compromise, all active sessions for the user may be revoked.

---

# 10. Password Reset

Password reset should use a short-lived, single-use reset token.

Flow:

```text
Forgot Password
      ↓
Request reset
      ↓
Send reset link/token
      ↓
Validate token
      ↓
Set new password
      ↓
Invalidate reset token
      ↓
Revoke existing sessions
      ↓
Audit event
```

The system should not reveal whether an email address is registered.

Reset tokens must not be stored or logged in plaintext if persisted server-side; store a secure hash/reference where the implementation supports it.

---

# 11. Email Verification

If email verification is enabled for the deployment, it should be treated as an account-state check rather than as authorization itself.

Example:

```text
Registration
    ↓
Verification required
    ↓
Email verification
    ↓
Account activated
```

A verified email does **not** grant elevated permissions.

---

# 12. Account Status

Users should have a server-controlled account status such as:

```text
ACTIVE
DISABLED
```

Potential future states may include:

```text
PENDING
SUSPENDED
LOCKED
```

The backend must reject authentication or authenticated requests appropriately for disabled/suspended accounts.

Disabling a user should also revoke active refresh sessions.

---

# 13. Organization Context

Tenant context is one of the most important security boundaries in CampusOps.

A request should conceptually become:

```text
HTTP Request
    ↓
JWT validation
    ↓
Authenticated User
    ↓
Resolve Organization Context
    ↓
Authorization
    ↓
Tenant-scoped business operation
```

The application should never use this pattern as its security source:

```ts
const organizationId = req.body.organizationId;
```

Instead, organization context comes from trusted authenticated membership/session context.

For example:

```ts
const organizationId = request.user.organizationId;
```

Even then, the service/repository layer must apply the tenant filter to the actual database operation.

---

# 14. Tenant Isolation

Every tenant-owned entity defined in the database architecture should carry:

```text
organizationId
```

Examples:

```text
Student
Staff
Department
Complaint
LeaveRequest
Visitor
Visit
Notice
Asset
DocumentTemplate
GeneratedDocument
ApprovalRequest
Event
Notification
AuditLog
```

The database query should therefore conceptually be:

```ts
where: {
  id: resourceId,
  organizationId: currentOrganizationId,
}
```

rather than:

```ts
where: {
  id: resourceId,
}
```

This is especially important for:

- GET by ID,
- UPDATE,
- DELETE,
- attachment access,
- generated document access,
- exports,
- reports,
- search,
- bulk operations.

---

# 15. Defense in Depth for Tenant Isolation

Tenant isolation should be enforced at multiple layers.

## Layer 1 — Authentication Context

Determine the authenticated organization.

## Layer 2 — Authorization

Verify that the user has the required permission.

## Layer 3 — Service Layer

Pass trusted organization context into business operations.

## Layer 4 — Database Query

Always filter tenant-owned records by `organizationId`.

Example:

```ts
await prisma.complaint.findFirst({
  where: {
    id: complaintId,
    organizationId,
  },
});
```

## Layer 5 — Resource Authorization

For sensitive resources, verify additional relationships such as:

```text
User → Staff
Staff → Department
Teacher → Assigned Student/Class
User → Created Document
```

Not every module needs complex resource-level rules, but the architecture must allow them.

---

# 16. Preventing IDOR / BOLA

A common vulnerability is:

```text
GET /complaints/123
```

where the attacker changes:

```text
123 → 124
```

and receives another organization's complaint.

The endpoint must not fetch by ID alone.

Bad:

```ts
findUnique({
  where: { id },
});
```

Safer:

```ts
findFirst({
  where: {
    id,
    organizationId,
  },
});
```

The same principle applies to:

- students,
- staff,
- leave requests,
- visitors,
- notices,
- assets,
- documents,
- approvals,
- events,
- attachments.

A nonexistent record and a record outside the user's tenant can normally produce the same not-found result to avoid information leakage.

---

# 17. RBAC Model

CampusOps uses role-based access control.

Conceptually:

```text
User
  ↓
UserRole
  ↓
Role
  ↓
RolePermission
  ↓
Permission
```

This aligns with the database architecture defined in `03-DATABASE-ARCHITECTURE.md`.

Roles group permissions.

Permissions represent actions.

This prevents business code from becoming a collection of hard-coded role checks.

---

# 18. Platform Roles vs School Roles

There are two authorization levels.

## 18.1 Platform Roles

Used by the SaaS provider.

Example:

```text
SAAS_SUPER_ADMIN
```

These roles operate at the platform level and must not automatically be treated as ordinary school users.

## 18.2 School Roles

Examples from the product requirements:

```text
SCHOOL_ADMIN
PRINCIPAL
TEACHER
MAINTENANCE_STAFF
RECEPTIONIST
ACCOUNTANT
```

The implementation can add more school roles as requirements evolve.

---

# 19. Permission Naming Convention

Permissions should use a predictable `resource.action` format.

Recommended convention:

```text
resource.action
```

Examples:

```text
student.view
student.create
student.update
student.delete

staff.view
staff.create
staff.update

complaint.view
complaint.create
complaint.assign
complaint.update
complaint.close

leave.view
leave.create
leave.approve
leave.reject

visitor.view
visitor.create
visitor.checkout

notice.view
notice.create
notice.publish
notice.archive

asset.view
asset.create
asset.update
asset.assign
asset.retire

document.view
document.generate
document.download

approval.view
approval.act
```

Additional permissions can be introduced without changing the fundamental authorization model.

---

# 20. Example Role Permission Matrix

The exact matrix should be finalized during implementation, but the intended direction is:

| Capability | School Admin | Principal | Teacher | Maintenance | Receptionist | Accountant |
|---|---:|---:|---:|---:|---:|---:|
| Manage users | Yes | Limited | No | No | No | No |
| Manage roles | Yes | No | No | No | No | No |
| Student read | Yes | Yes | Assigned scope | No | Limited | Limited |
| Staff read | Yes | Yes | Limited | Limited | Limited | Limited |
| Complaints | Full | Read/oversight | Create/read as allowed | Assigned work | Create/read as allowed | No/limited |
| Leave | Full | Approve | Request/view own | Request/view own | Request/view own | Request/view own |
| Visitors | Full | Read | Limited | No | Full operational | No |
| Notices | Full | Create/publish as allowed | Read | Read | Read | Read |
| Assets | Full | Read/oversight | Limited | Operational | Limited | Financial scope |
| Documents | Full | Generate/approve as allowed | Limited | Limited | Operational | Salary/financial scope |
| Approvals | Full | Approve assigned | Request/view own | Request/view own | Limited | Financial approvals |
| Events | Full | Full/oversight | Create/read as allowed | Read | Operational | Read |
| Reports | Full | Broad | Limited | Operational | Visitor-focused | Financial/operational |

This table is a starting authorization model, not a substitute for the final permission seed.

---

# 21. Permission Guards in NestJS

Authorization should be explicit at controller boundaries.

Conceptual example:

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('complaint.create')
@Post()
createComplaint() {
  // ...
}
```

A reusable decorator such as:

```ts
@RequirePermissions('asset.update')
```

is preferable to scattering logic like:

```ts
if (user.role === 'SCHOOL_ADMIN') {
  ...
}
```

throughout controllers.

The guard should obtain the authenticated user's permissions and deny access when the required permission is absent.

---

# 22. Role Checks

Role checks still have legitimate uses for coarse platform behavior.

For example:

```text
Platform administration
SaaS billing/configuration
System-level maintenance
```

But normal business authorization should primarily be permission-driven.

Avoid:

```ts
if (user.role === 'PRINCIPAL') ...
```

everywhere in the codebase.

Prefer:

```text
Can this user perform approval.act?
```

This makes future roles easier to add.

---

# 23. Resource-Level Authorization

RBAC answers:

> Is this user allowed to perform this kind of action?

Resource authorization answers:

> Is this particular resource within the user's permitted scope?

Examples:

### Teacher

A teacher may have:

```text
student.view
```

but only for students/classes within the teacher's assigned scope.

### Maintenance Staff

A maintenance employee may:

```text
complaint.view
complaint.update
```

but primarily for complaints assigned to them.

### Accountant

An accountant may have access to financial/approval information without automatically receiving unrestricted access to every operational record.

This logic belongs in the corresponding domain service/policy layer.

---

# 24. School Admin vs Principal

These roles should not automatically be identical.

A practical distinction is:

```text
School Admin
  → operational configuration
  → users and role administration
  → broad module management

Principal
  → school-level oversight
  → approvals
  → notices/events
  → reports
  → operational supervision
```

The exact permission matrix should determine the real difference.

---

# 25. Authentication Guards

Recommended backend guard pipeline:

```text
Request
  ↓
Rate Limit / Security Middleware
  ↓
JWT Authentication Guard
  ↓
User/Session Validation
  ↓
Organization Context
  ↓
Permission Guard
  ↓
Controller
  ↓
Service
  ↓
Tenant-scoped DB operation
```

Not every endpoint needs every guard, but protected business endpoints should follow this model.

Public endpoints such as login and password-reset initiation should use their own security controls.

---

# 26. Organization-Aware Request Context

A request context object can make tenant handling consistent.

Conceptually:

```ts
type AuthContext = {
  userId: string;
  organizationId: string;
  sessionId?: string;
  permissions: string[];
};
```

Business services should accept trusted context rather than arbitrary organization IDs from request payloads.

Example:

```ts
createComplaint(authContext, dto)
```

The DTO contains complaint data.

The context supplies the organization.

---

# 27. API Design Rule

Avoid APIs that make the tenant boundary client-controlled.

Avoid:

```text
POST /organizations/:organizationId/complaints
```

for ordinary authenticated school users when the organization is already known from authentication.

Prefer:

```text
POST /complaints
```

and derive the organization server-side.

Organization-scoped administrative APIs may still explicitly expose organization IDs for platform administrators, but those endpoints require stronger platform-level authorization.

---

# 28. Secure File Access

File metadata is stored in the database, while physical files are handled through the file-storage abstraction.

Protected files must not be exposed simply because a path is known.

Bad:

```text
/public/uploads/school-a/document.pdf
```

if that URL allows unauthorized access.

Preferred flow:

```text
Request file
    ↓
Authenticate
    ↓
Resolve organization
    ↓
Check permission
    ↓
Check document/file ownership
    ↓
Read from storage
    ↓
Stream file / issue controlled access
```

This applies to:

- complaint attachments,
- notice attachments,
- generated documents,
- employee/student documents,
- visitor photos where applicable.

---

# 29. Bulk Operations

Bulk endpoints require the same tenant and permission controls as single-record endpoints.

For example:

```text
POST /assets/bulk-update
```

must not trust a list of IDs blindly.

The backend should:

1. authenticate the user,
2. verify permission,
3. load records using the current organization scope,
4. ensure all requested records belong to that organization,
5. apply the transaction.

Never partially operate on records from another tenant without explicitly designed behavior.

---

# 30. Search and Reporting Authorization

Search endpoints and reports are common tenant-leak points.

Every query must apply:

```text
organizationId = currentOrganizationId
```

before filters, pagination, sorting, aggregation, or export.

Examples:

```text
Complaint dashboard
Leave report
Visitor report
Asset report
Notice statistics
```

must never aggregate across schools for ordinary school users.

Platform-wide reporting is a separate privileged capability.

---

# 31. Notifications

Notifications must also be tenant-aware.

A notification should contain enough context to identify:

```text
recipient
organization
notification type
related resource
delivery status
```

A user must not be able to retrieve another organization's notifications by changing an ID.

Notification provider integrations must not bypass application authorization.

---

# 32. Audit Events

Security-sensitive events should be auditable.

Examples:

```text
LOGIN_SUCCESS
LOGIN_FAILURE
LOGOUT
PASSWORD_CHANGED
PASSWORD_RESET_REQUESTED
PASSWORD_RESET_COMPLETED
ACCOUNT_DISABLED
ROLE_ASSIGNED
ROLE_REMOVED
PERMISSION_CHANGED
USER_CREATED
USER_DELETED
ORGANIZATION_CREATED
UNAUTHORIZED_ACCESS_ATTEMPT
```

Audit logs should capture useful metadata such as:

```text
actor
organization
action
resource
timestamp
request metadata where appropriate
```

Do not put passwords, raw tokens, or other secrets into audit records.

---

# 33. Rate Limiting

Authentication endpoints are high-value targets.

Apply rate limiting to at least:

```text
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/refresh
```

The initial implementation can use application-level or deployment-supported rate limiting without introducing Redis solely for this feature.

If traffic grows, a shared rate-limit store can be introduced later.

---

# 34. Brute-Force Protection

Repeated failed authentication attempts should be controlled.

Possible controls:

- IP-based throttling,
- account/identifier-based throttling,
- progressive delay,
- temporary lockout where appropriate,
- monitoring/audit events.

Avoid revealing whether the username/email exists.

---

# 35. CSRF and Cookie Security

If refresh tokens are stored in cookies:

```text
HttpOnly = true
Secure = true in production
SameSite = appropriate for deployment
```

If cross-site requests require relaxed SameSite behavior, implement an explicit CSRF protection strategy.

Access tokens should not be unnecessarily exposed to browser JavaScript when a safer cookie-based session design is appropriate.

---

# 36. CORS

CORS should allow only configured frontend origins.

Do not use:

```text
Access-Control-Allow-Origin: *
```

for authenticated browser APIs.

Production configuration should explicitly identify the trusted frontend origin(s).

---

# 37. Environment Secrets

Secrets must come from environment/secret management rather than source code.

Examples:

```text
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
DATABASE_URL
EMAIL_PROVIDER_KEY
STORAGE_CREDENTIALS
```

Never commit production secrets to Git.

Never expose backend secrets through Next.js public environment variables.

---

# 38. Session Revocation Rules

Revoke active refresh sessions when:

- user explicitly logs out,
- password is changed,
- password reset completes,
- account is disabled,
- suspicious refresh-token reuse is detected,
- administrator explicitly requests a security reset.

For an emergency organization-wide incident, the platform may support broader session invalidation later.

---

# 39. Multi-Tenant Data Access Pattern

A recommended service pattern is:

```ts
async getComplaint(
  organizationId: string,
  complaintId: string,
) {
  return this.prisma.complaint.findFirst({
    where: {
      id: complaintId,
      organizationId,
    },
  });
}
```

For mutations:

```ts
const complaint = await prisma.complaint.findFirst({
  where: {
    id: complaintId,
    organizationId,
  },
});

if (!complaint) {
  throw new NotFoundException();
}
```

Then perform the business operation.

This makes cross-tenant access fail naturally.

---

# 40. Transactions and Authorization

Authorization checks and state changes should be coordinated carefully.

For example, approving a leave request should conceptually be:

```text
Authenticate
    ↓
Permission check
    ↓
Tenant/resource check
    ↓
Validate state
    ↓
Transaction
    ├── update request
    ├── create approval action/history
    ├── update leave balance if applicable
    └── create notification
```

Do not authorize against one record and then update another record without applying the same tenant/resource constraints.

---

# 41. Common Anti-Patterns to Avoid

### Anti-pattern 1 — Trusting organizationId from DTO

```ts
dto.organizationId
```

**Do not use it as the security boundary.**

### Anti-pattern 2 — Query by ID only

```ts
findUnique({ where: { id } })
```

for tenant-owned resources.

### Anti-pattern 3 — Frontend-only authorization

Hiding a button does not secure an endpoint.

### Anti-pattern 4 — Role strings everywhere

```ts
if (role === 'ADMIN')
```

throughout business logic becomes difficult to maintain.

### Anti-pattern 5 — Long-lived JWTs

Avoid multi-day access tokens.

### Anti-pattern 6 — Storing tokens in unsafe browser storage

Do not casually put long-lived refresh credentials in `localStorage`.

### Anti-pattern 7 — Public protected files

Known storage paths must not equal authorization.

### Anti-pattern 8 — Cross-tenant reporting queries

A report that forgets `organizationId` can leak an entire dataset.

### Anti-pattern 9 — Logging secrets

Never log credentials or tokens while debugging authentication.

### Anti-pattern 10 — Overengineering too early

Do not introduce microservices, an identity server, Kafka, or Redis solely because RBAC exists.

---

# 42. Testing Strategy

Authentication and tenancy require dedicated security tests.

## 42.1 Authentication Tests

Test:

- valid login,
- invalid password,
- unknown account,
- disabled account,
- expired access token,
- invalid refresh token,
- refresh token rotation,
- refresh token reuse,
- logout,
- password reset,
- password change.

## 42.2 Authorization Tests

For every sensitive module:

```text
Allowed permission → success
Missing permission → 403
Unauthenticated → 401
```

## 42.3 Tenant Isolation Tests

At minimum:

```text
User A + Organization A resource → allowed
User A + Organization B resource → denied/not found
User B + Organization B resource → allowed
```

Repeat for:

- students,
- staff,
- complaints,
- leave,
- visitors,
- notices,
- assets,
- documents,
- approvals,
- events,
- notifications.

## 42.4 IDOR/BOLA Tests

For every `/:id` endpoint:

```text
Authenticate as Organization A
Request Organization B resource ID
Expected: denied or not found
```

## 42.5 File Authorization Tests

Attempt to download:

```text
Organization A file as Organization B user
```

Expected:

```text
Denied
```

---

# 43. Security Test Matrix

| Test | Expected |
|---|---|
| No JWT | 401 |
| Invalid JWT | 401 |
| Expired JWT | 401 |
| Disabled user | Denied |
| Missing permission | 403 |
| Valid permission + same tenant | Success |
| Valid permission + different tenant | Denied/not found |
| Different tenant file download | Denied |
| Cross-tenant report | Impossible |
| Invalid refresh token | Denied |
| Reused rotated refresh token | Denied / session revoked |
| Password reset token reused | Denied |
| Excessive login attempts | Throttled |

---

# 44. Platform Admin Isolation

`SAAS_SUPER_ADMIN` is a special case.

Platform administrators may require cross-organization visibility for:

```text
Organizations
subscriptions
platform health
tenant support
platform reports
```

However, this should be explicit.

Do not implement:

```ts
if (role === 'SAAS_SUPER_ADMIN') {
  removeAllOrganizationFilters();
}
```

globally.

Instead, platform-level services/endpoints should intentionally request cross-tenant access.

This prevents accidental privilege escalation.

---

# 45. Future API / Service Accounts

Future public APIs may require service accounts or API keys.

That should be designed separately from human-user JWT authentication.

Potential future model:

```text
Organization
   ↓
Service Account
   ↓
API Credential
   ↓
Scoped Permissions
```

API credentials should have:

- organization ownership,
- explicit scopes,
- revocation,
- expiration where appropriate,
- audit logging.

Do not add this complexity to the MVP unless public APIs are actually required.

---

# 46. Recommended NestJS Module Structure

Authentication and authorization can be organized approximately as:

```text
apps/api/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   ├── guards/
│   ├── decorators/
│   ├── dto/
│   └── services/
│
├── users/
├── organizations/
├── roles/
├── permissions/
└── common/
    ├── guards/
    ├── decorators/
    ├── interceptors/
    └── context/
```

The exact folder structure can evolve, but authentication should remain clearly separated from individual business domains.

---

# 47. Request Authorization Example

A complaint creation request should conceptually follow:

```text
POST /complaints
       ↓
JWT validation
       ↓
User authenticated?
       ↓ yes
Organization context resolved
       ↓
Has complaint.create?
       ↓ yes
Validate DTO
       ↓
ComplaintService
       ↓
organizationId from AuthContext
       ↓
Create complaint
       ↓
Audit/activity/notification as required
```

The browser never decides which organization owns the new complaint.

---

# 48. MVP Security Baseline

The first production-capable version should have:

- password hashing,
- JWT authentication,
- short-lived access tokens,
- refresh-token rotation/revocation,
- secure logout,
- password reset,
- account enable/disable,
- RBAC,
- permission guards,
- organization context,
- tenant-scoped queries,
- IDOR/BOLA protection,
- protected file access,
- rate limiting on auth endpoints,
- secure CORS,
- environment-managed secrets,
- audit events for security actions,
- cross-tenant automated tests.

---

# 49. What We Do Not Need Yet

To stay cost-conscious, the MVP does **not** require:

- microservice-based identity service,
- Keycloak/Auth0-style external identity platform,
- Kafka,
- Kubernetes,
- distributed session infrastructure,
- Redis solely for authentication,
- complex policy engines,
- enterprise SSO,
- SCIM,
- advanced device management.

These can be introduced if actual scale or customer requirements justify them.

---

# 50. Final Architecture

The intended security architecture is:

```text
                    ┌──────────────────────┐
                    │      Next.js UI      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     NestJS API       │
                    │                      │
                    │ JWT Authentication   │
                    │        ↓             │
                    │ Auth Context         │
                    │        ↓             │
                    │ Permission Guard      │
                    │        ↓             │
                    │ Resource Policy      │
                    │        ↓             │
                    │ Domain Service       │
                    │        ↓             │
                    │ Tenant-scoped Prisma │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ PostgreSQL            │
                    │ organizationId        │
                    │ tenant isolation      │
                    └──────────────────────┘
```

The most important invariant is:

```text
Authenticated User
      +
Required Permission
      +
Correct Organization
      +
Authorized Resource
      =
Allowed Operation
```

If any one of these is missing, the operation must be denied.

---

# 51. Implementation Checklist

Before considering authentication/RBAC/tenancy complete:

- [ ] User authentication implemented.
- [ ] Passwords securely hashed.
- [ ] Access token TTL configurable.
- [ ] Refresh token rotation implemented.
- [ ] Refresh sessions revocable.
- [ ] Logout revokes refresh session.
- [ ] Password reset implemented securely.
- [ ] Disabled users blocked.
- [ ] Roles seeded.
- [ ] Permissions seeded.
- [ ] Role-permission mappings seeded.
- [ ] Permission guard implemented.
- [ ] Auth context implemented.
- [ ] Organization context cannot be client-controlled.
- [ ] Tenant-owned queries always include `organizationId`.
- [ ] Resource-level authorization implemented where required.
- [ ] File downloads are authorization-protected.
- [ ] Reports/searches are tenant-scoped.
- [ ] Auth endpoints rate-limited.
- [ ] CORS restricted.
- [ ] Secrets excluded from source control.
- [ ] Security audit events recorded.
- [ ] Cross-tenant tests added.
- [ ] IDOR/BOLA tests added.

---

# 52. Summary

CampusOps should use a straightforward security model:

```text
JWT Authentication
        +
Role → Permission RBAC
        +
Organization-scoped access
        +
Resource-level authorization
        +
Tenant-filtered Prisma queries
```

This provides strong isolation without introducing unnecessary infrastructure.

The most important implementation rule is simple:

> **Never rely on the frontend, URL, DTO, or user-supplied organization ID to enforce tenant security.**

The authenticated server context determines the tenant, and every tenant-owned database operation enforces that boundary.

---

**Next document:** `05-BACKEND-ARCHITECTURE.md`
