# CampusOps — Security & Deployment

## 1. Purpose

This document defines the security baseline and cost-conscious deployment architecture for CampusOps.

Target stack:

- Next.js
- NestJS
- PostgreSQL
- Prisma
- Optional Redis/job infrastructure only when justified
- Provider abstractions for email, storage, and future messaging

The goal is production readiness without prematurely adopting microservices, Kubernetes, Kafka, or multiple databases.

---

# 2. Security Model

The backend is the security boundary.

Frontend checks improve UX but do not provide authorization.

Every protected request should pass through:

```text
Authentication
      ↓
Organization Context
      ↓
Permission Check
      ↓
Resource Authorization
      ↓
Business Validation
      ↓
Database Operation
```

---

# 3. Multi-Tenant Isolation

Every tenant-owned record must be scoped to its organization.

Rules:

- Derive organization from authenticated context.
- Do not trust client organization IDs.
- Validate parent/child resources belong to the same organization.
- Apply organization filtering to list, detail, update, delete, report, and export operations.
- Test cross-tenant access explicitly.

A valid identifier must never be enough to cross an organization boundary.

---

# 4. Authentication

Use:

- Strong password hashing
- Short-lived access tokens
- Refresh-token rotation
- Refresh-token revocation
- Secure password reset
- Account status checks
- Optional email verification

Passwords must never be stored in plaintext.

---

# 5. Token Security

Do not place sensitive long-lived tokens in unsafe browser storage without a deliberate threat-model decision.

If refresh tokens are cookie-based:

- Secure
- HttpOnly
- Appropriate SameSite
- Narrow path/domain where practical

Access token strategy should be documented consistently across frontend and backend.

---

# 6. RBAC

Authorization should use explicit permissions.

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

Role names alone should not be used as the only security check.

Resource-level checks are still required.

---

# 7. BOLA / IDOR Protection

For every endpoint accepting a resource ID:

```text
Find resource
  ↓
Verify organization
  ↓
Verify permission
  ↓
Verify resource-level access
  ↓
Perform action
```

Never:

```text
prisma.entity.findUnique({ where: { id } })
```

and then assume the caller is allowed to use the returned entity.

---

# 8. Input Security

Validate:

- Body
- Query parameters
- Path parameters
- Headers where relevant
- Uploaded files

Apply:

- Maximum lengths
- Numeric limits
- Enum validation
- Date validation
- Safe HTML handling
- File type/size restrictions

Never directly interpolate user input into SQL.

---

# 9. File Security

Files may contain sensitive student/staff information.

Requirements:

- Private by default
- Authorization before download
- MIME/type validation
- Size limits
- Safe filenames
- No executable uploads where unnecessary
- Malware scanning can be added later
- Storage provider hidden behind abstraction

Avoid public static file serving for protected documents.

---

# 10. Secrets Management

Secrets include:

- Database credentials
- JWT signing secrets
- Refresh-token secrets
- Email provider keys
- Storage credentials
- Payment provider secrets
- OAuth credentials

Rules:

- Never commit secrets to Git.
- Use environment variables/secrets management.
- Maintain `.env.example` without real credentials.
- Rotate compromised secrets.
- Use separate secrets for environments.

---

# 11. CORS & Headers

Production CORS should allow only known frontend origins.

Do not use unrestricted:

```text
Access-Control-Allow-Origin: *
```

for authenticated application traffic.

Configure appropriate security headers and HTTPS.

---

# 12. Rate Limiting

At minimum rate-limit:

- Login
- Password reset
- Verification/OTP
- Public endpoints
- File upload
- Expensive report/export operations

Protect against brute force and accidental request floods.

---

# 13. Logging

Logs should support diagnosis without exposing secrets.

Good log context:

```text
timestamp
level
service
requestId
organizationId where safe
userId where safe
operation
duration
result
```

Never log:

- Passwords
- JWTs
- Refresh tokens
- API keys
- Full payment secrets
- Sensitive personal data unnecessarily

---

# 14. Audit Logging

Security/business-sensitive actions should create audit events.

Examples:

- Login failures
- Role changes
- Staff deactivation
- Attendance corrections
- Leave approvals
- Asset retirement
- Document generation
- File access where required
- Organization configuration changes

Audit records must not be editable through normal application APIs.

---

# 15. Database Security

Production PostgreSQL should:

- Use strong credentials
- Require encrypted connections where supported
- Restrict network access
- Use least-privilege application credentials
- Run migrations deliberately
- Have backups
- Have restore procedures

Avoid giving the application unnecessary database privileges.

---

# 16. Prisma Security

Prisma should be accessed through controlled application services.

Avoid scattering unrestricted Prisma queries throughout controllers.

Prefer:

```text
Controller
  ↓
Service
  ↓
Repository/data access
  ↓
Prisma
```

Tenant filters and authorization should remain difficult to accidentally bypass.

---

# 17. Transactions & Concurrency

Use transactions for multi-step state changes.

Examples:

- Leave approval + balance
- Asset transfer
- Fee payment
- Attendance correction
- Approval completion

Handle concurrent updates explicitly.

Do not assume single-user behavior in a multi-user SaaS.

---

# 18. Deployment Architecture

Cost-conscious initial deployment:

```text
                    Internet
                       |
                 Reverse Proxy /
                    Platform
                  /           \
             Next.js          NestJS
                               |
                         PostgreSQL
                               |
                    Optional Redis later
```

Storage may initially be local only for controlled/single-instance environments, but production multi-instance deployment should use durable object storage.

---

# 19. Recommended Initial Topology

Keep the system simple:

```text
Frontend Service
     ↓
Backend Service
     ↓
Managed PostgreSQL
```

Add:

```text
Object Storage
```

when protected uploaded files/documents require durable shared storage.

Add Redis/worker infrastructure only when background workloads justify it.

---

# 20. Why Not Microservices Yet?

The product has strong domain boundaries, but that does not mean each domain needs its own service.

A modular monolith gives:

- Lower operational cost
- Easier local development
- Simpler transactions
- Fewer deployment units
- Easier debugging
- Faster feature delivery

Extract services only when there is a demonstrated scaling, ownership, or reliability reason.

---

# 21. Background Jobs

Background processing may eventually be useful for:

- Email
- Large PDF generation
- Report exports
- Scheduled notices
- Reminder notifications
- Warranty reminders

Initially, use simple application mechanisms where load is low.

When reliability/volume requires it:

```text
NestJS
  ↓
Redis / Queue
  ↓
Worker
```

Keep the job payload small and idempotent.

---

# 22. Health Checks

Expose health endpoints suitable for deployment monitoring.

Example:

```text
GET /health
```

Health checks should distinguish:

- Application alive
- Database reachable
- Critical dependencies available

Do not expose secrets or internal infrastructure details.

---

# 23. Graceful Shutdown

On deployment termination:

```text
Receive SIGTERM
      ↓
Stop accepting new work
      ↓
Finish safe in-flight work
      ↓
Close database connections
      ↓
Close optional queues/connections
      ↓
Exit
```

This reduces dropped requests and corrupted workflows.

---

# 24. Database Migrations

Production migrations should be:

- Version controlled
- Reviewed
- Tested against representative data
- Backward-compatible where possible
- Run deliberately during deployment

Avoid destructive migrations without a backup/recovery plan.

---

# 25. Backups

At minimum:

- Automated database backups
- Defined retention
- Periodic restore testing
- Recovery documentation

A backup that has never been restored is only an assumption.

---

# 26. Observability

Track:

### Application

- Request rate
- Error rate
- Latency
- Slow endpoints
- Authentication failures

### Database

- Connection usage
- Slow queries
- Storage
- CPU/memory where available

### Business

- Failed notifications
- Failed document generation
- Pending approvals
- Job failures

Start with platform logs/metrics before adopting a large observability stack.

---

# 27. Deployment Environments

Recommended:

```text
local
development
staging
production
```

At minimum, separate staging and production databases.

Never point local development at production data.

---

# 28. Environment Configuration

Maintain:

```text
.env.example
```

with categories such as:

```text
DATABASE_URL
JWT_SECRET
REFRESH_TOKEN_SECRET

FRONTEND_URL
CORS_ORIGINS

EMAIL_PROVIDER_*
STORAGE_*
REDIS_*
```

Do not commit real values.

Configuration should be validated during application startup.

---

# 29. CI/CD

Pipeline should include:

```text
Install
 ↓
Lint
 ↓
Type Check
 ↓
Unit Tests
 ↓
Build
 ↓
Migration validation
 ↓
Deploy
 ↓
Health Check
```

Production deployment should fail if required validation fails.

---

# 30. Security Testing

Before production test:

- Cross-tenant access
- Unauthorized role access
- Resource ID tampering
- File authorization
- Login brute force
- Password reset abuse
- Token replay/rotation
- Invalid state transitions
- Mass assignment
- Oversized payloads
- Malicious files
- Report/export authorization
- Audit integrity

---

# 31. Data Privacy

CampusOps may contain:

- Student information
- Guardian information
- Staff information
- Visitor information
- Documents
- Contact details

Principles:

- Collect only needed information.
- Restrict access.
- Minimize logging.
- Protect downloads.
- Define retention policies.
- Avoid exposing data through search/report APIs.
- Preserve auditability for sensitive changes.

---

# 32. Production Readiness Checklist

### Application

- [ ] Production build succeeds
- [ ] Configuration validated
- [ ] Health endpoint works
- [ ] Graceful shutdown tested
- [ ] Error handling standardized

### Security

- [ ] HTTPS
- [ ] CORS restricted
- [ ] Authentication hardened
- [ ] RBAC/permissions tested
- [ ] Tenant isolation tested
- [ ] File authorization tested
- [ ] Rate limiting enabled
- [ ] Secrets externalized

### Database

- [ ] Migrations reviewed
- [ ] Backups enabled
- [ ] Restore tested
- [ ] Indexes reviewed
- [ ] Connection limits understood

### Operations

- [ ] Logs available
- [ ] Error monitoring available
- [ ] Deployment rollback plan
- [ ] Staging environment
- [ ] Incident/runbook basics

---

# 33. Cost-Conscious Evolution

Start with:

```text
Next.js
+
NestJS
+
PostgreSQL
```

Then add only when needed:

```text
Object Storage
Redis/Queue
Worker
External providers
```

Avoid paying for infrastructure before the workload justifies it.

---

# 34. Final Security Principles

1. Backend is the security boundary.
2. Tenant isolation is mandatory.
3. Permissions are explicit.
4. Resource authorization is mandatory.
5. Files are private by default.
6. Secrets never enter source control or logs.
7. Critical state changes are transactional and auditable.
8. Backups must be restorable.
9. Keep deployment simple.
10. Complexity should be earned by real product needs.
