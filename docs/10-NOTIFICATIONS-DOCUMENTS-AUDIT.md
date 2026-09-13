# CampusOps — Notifications, Documents & Audit

## 1. Purpose

This document defines three shared platform capabilities used across CampusOps:

- Notifications
- Document generation and file management
- Audit logging and activity history

These capabilities should be reusable platform services rather than duplicated inside every business module.

---

# 2. Notification Architecture

## 2.1 Principle

Business modules should create notification intent/events.

They should not contain provider-specific delivery code.

Preferred flow:

```text
Business Event
    ↓
Notification Service
    ↓
Template / Recipient Resolution
    ↓
Channel Provider
    ↓
Delivery Result
```

Possible channels:

- Email
- Push
- SMS
- WhatsApp

Email and Push are core channels from the requirements. SMS/WhatsApp should remain optional/future integrations unless explicitly enabled.

---

# 3. Notification Event Examples

### Complaints

- Complaint assigned
- Complaint status changed
- Complaint completed

### Leave

- Leave submitted
- Approval required
- Leave approved
- Leave rejected

### Notices

- Notice published
- Notice reminder
- Read/acknowledgement reminder

### Documents

- Document generated
- Document ready

### Approvals

- Approval requested
- Approval reminder
- Approved
- Rejected

### Events

- Event reminder
- Event update
- Event cancellation

---

# 4. Notification Template

Templates should support:

- Event key
- Channel
- Subject/title
- Body
- Variable placeholders
- Active/inactive status
- Organization override where required

Example:

```text
leave.approved.email
leave.approved.push
```

Template rendering should validate required variables.

Never interpolate arbitrary HTML or untrusted input without appropriate escaping/sanitization.

---

# 5. Recipient Resolution

Recipient determination belongs to business/application logic.

Example:

```text
Leave Approved
      ↓
Staff
      ↓
Notification Preferences
      ↓
Email / Push
```

Do not blindly send every event to every organization member.

Recipients must be:

- Authorized
- Relevant
- Tenant-scoped
- Reachable through the selected channel

---

# 6. Notification Preferences

Users may eventually control preferences such as:

- Email enabled
- Push enabled
- Operational alerts
- Approval alerts
- Reminder alerts

Critical administrative/security notifications may not be fully suppressible.

Organization-level settings may define defaults.

---

# 7. Delivery & Retry

A notification should have a delivery lifecycle such as:

```text
PENDING
  ↓
PROCESSING
  ↓
SENT
```

or:

```text
FAILED → RETRY → SENT
```

Persist enough information to diagnose failures without storing unnecessary provider secrets or sensitive payloads.

Retry only failures that are safe to retry.

---

# 8. Idempotency

Provider retries or application retries must not create duplicate user-visible notifications.

Use stable notification/event identifiers where possible.

For example:

```text
businessEventId + recipient + channel
```

can help prevent duplicate delivery.

---

# 9. Provider Abstraction

Example:

```text
NotificationProvider
 ├── EmailProvider
 ├── PushProvider
 ├── SmsProvider
 └── WhatsAppProvider
```

Business modules should depend on the abstraction, not on a vendor SDK.

This keeps provider replacement inexpensive.

---

# 10. Document Generation

CampusOps requirements include:

- Bonafide Certificate
- Character Certificate
- Experience Letter
- Salary Certificate
- Visitor Pass
- Employee ID Card
- Student ID Card

The document system should support reusable templates.

---

# 11. Document Template

A template can contain:

- Name
- Type
- Version
- HTML/template content
- Variables
- Organization
- Active status
- Created/updated metadata

Templates should be versioned when generated documents must remain reproducible.

---

# 12. Document Generation Workflow

```text
Select Template
      ↓
Resolve Business Data
      ↓
Validate Required Variables
      ↓
Render Template
      ↓
Generate PDF
      ↓
Store File
      ↓
Create GeneratedDocument
      ↓
Audit
```

The generated document should reference the exact template version used.

---

# 13. File Storage Architecture

Use a storage abstraction:

```text
FileStorageService
      ↓
Local Storage (MVP)
      ↓
Future Object Storage
```

Possible future providers include S3-compatible storage/R2.

Business modules should store file metadata/reference rather than depending directly on filesystem paths.

---

# 14. Protected Files

A protected document must not become public merely because its storage path is known.

Recommended flow:

```text
Authenticated Request
      ↓
Authorization
      ↓
File Access Check
      ↓
Signed/controlled download
      ↓
File
```

The authorization decision must happen before serving the file.

---

# 15. Upload Validation

Validate:

- File size
- MIME type
- Extension
- File signature where practical
- Filename safety
- Organization ownership

Do not trust the browser-provided MIME type alone.

Avoid allowing executable content where unnecessary.

---

# 16. Document Metadata

A generated/uploaded document may track:

- Organization
- Owner/resource
- Template
- Template version
- File reference
- File name
- MIME type
- Size
- Created by
- Created timestamp
- Status

Retention/deletion should follow business and organizational policy.

---

# 17. Audit Logging

Audit logs answer:

```text
Who did what?
To which resource?
When?
In which organization?
What changed?
```

Audit should cover security-sensitive and business-critical operations.

---

# 18. Audit vs Activity

These are different.

### Audit log

Security/compliance-oriented immutable record.

Examples:

- User role changed
- Staff deactivated
- Leave approved
- Asset retired
- File access/security event
- Organization configuration changed

### Activity log

User-facing operational history.

Examples:

- Complaint moved to IN_PROGRESS
- Notice published
- Asset assigned
- Event updated

Do not use a single generic table to satisfy both purposes without defining their semantics.

---

# 19. Audit Event Structure

Conceptually:

```text
AuditLog
├── organizationId
├── actorUserId
├── action
├── entityType
├── entityId
├── timestamp
├── request/correlation ID
├── before
├── after
└── metadata
```

Sensitive data should not be copied unnecessarily into `before`/`after` snapshots.

Secrets, passwords, tokens, and authentication credentials must never be logged.

---

# 20. Audit Actions

Examples:

```text
AUTH_LOGIN
AUTH_LOGOUT
AUTH_FAILED_LOGIN
USER_CREATED
USER_ROLE_CHANGED
STAFF_DEACTIVATED

LEAVE_SUBMITTED
LEAVE_APPROVED
LEAVE_REJECTED
LEAVE_CANCELLED

ATTENDANCE_MARKED
ATTENDANCE_CORRECTED

COMPLAINT_CREATED
COMPLAINT_ASSIGNED
COMPLAINT_STATUS_CHANGED

ASSET_ASSIGNED
ASSET_TRANSFERRED
ASSET_RETIRED

DOCUMENT_GENERATED
FILE_DOWNLOADED

NOTICE_PUBLISHED
APPROVAL_COMPLETED
```

Action names should be stable and machine-readable.

---

# 21. Audit Immutability

Normal application users should not be able to:

- Edit audit records
- Delete audit records
- Change the actor
- Change the timestamp

Retention policies may eventually archive records, but ordinary CRUD should not modify audit history.

---

# 22. Correlation IDs

Each API request should have a correlation/request ID.

That ID should connect:

```text
HTTP Request
 ↓
Application Service
 ↓
Database Operation
 ↓
Notification
 ↓
Audit
 ↓
Logs
```

This is especially useful when investigating failed workflows.

---

# 23. Notification + Audit Integration

Important notification actions should be traceable without treating delivery logs as the audit source.

Example:

```text
Leave Approved
   ├── Business state changed
   ├── Audit recorded
   └── Notification requested
```

A failed email should not roll back an already-valid leave approval unless the business rule explicitly requires synchronous delivery.

---

# 24. Reports & Audit

Administrators may need filters:

- Date range
- Actor
- Action
- Entity
- User
- Department
- Severity/category where applicable

Audit access itself should be permission-protected and may itself be audited.

---

# 25. API Boundaries

Representative endpoints:

```text
GET  /notifications
PATCH /notifications/:id/read

GET  /notification-preferences
PATCH /notification-preferences

GET  /documents
POST /documents
GET  /documents/:id
GET  /documents/:id/download

GET  /document-templates
POST /document-templates
PATCH /document-templates/:id

GET /audit-logs
GET /activity
```

Exact routes should follow the API contract document.

---

# 26. Testing

### Notifications

- Correct recipient
- Correct tenant
- Template variables
- Provider failure
- Retry
- Duplicate prevention
- Preference handling

### Documents

- Template rendering
- Missing variables
- PDF generation
- Correct template version
- File authorization
- Upload validation
- Cross-tenant access prevention

### Audit

- Important action creates audit event
- Actor is correct
- Organization is correct
- Before/after data is safe
- Audit cannot be edited through normal APIs
- Sensitive data is excluded

---

# 27. MVP

Implement:

- Email notifications through provider abstraction
- In-app notification records
- Basic notification templates
- Document templates
- PDF generation
- Local file storage abstraction
- Protected file downloads
- Audit logs
- User-facing activity history
- Correlation IDs

Defer complex multi-provider orchestration until usage requires it.

---

# 28. Key Principles

1. Business modules emit intent; providers deliver it.
2. Files are references/metadata, not business state.
3. Protected files require authorization.
4. Audit logs are not ordinary CRUD.
5. Activity history is separate from audit.
6. Notification delivery failure should not automatically undo business state.
7. Never log secrets.
8. Keep provider integrations replaceable.
