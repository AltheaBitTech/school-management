# CampusOps — Student & Academic-Adjacent Workflows

**Document:** 07-STUDENT-ACADEMIC-WORKFLOWS.md  
**Product:** School Operations Management SaaS / CampusOps  
**Status:** Workflow specification  
**Previous:** 06-FRONTEND-ARCHITECTURE.md  
**Next:** 08-STAFF-ATTENDANCE-LEAVE.md

---

## 1. Purpose

This document defines how student-related and academic-adjacent operational workflows should work inside CampusOps.

CampusOps is an **operations management platform that complements an existing School ERP**. It is not intended to replace the full academic ERP.

The focus here is therefore on:

- student operational records,
- student/guardian information needed by operations,
- notices and communication,
- documents,
- events,
- complaints and operational requests,
- permissions and visibility,
- workflows involving teachers and school administrators.

Detailed academic functions such as full examination management, marks, curriculum, timetable engines, and complete learning management are outside this product scope unless explicitly added later.

---

# 2. Student Domain Position

The Student domain is a core operational entity.

A student may participate in workflows involving:

```text
Student
  ├── Parent / Guardian
  ├── Department / organizational context
  ├── Documents
  ├── Notices
  ├── Events
  └── Operational workflows
```

The database architecture defines:

```text
Student
ParentGuardian
StudentGuardian
```

These relationships should remain explicit rather than storing guardian information as unstructured text.

---

# 3. Student Information

The operational student profile should support information required by the product.

Typical information:

```text
Student ID / internal identifier
Admission number
Name
Date of birth where required
Contact/guardian references
Department/class information where applicable
Status
Operational documents
```

The exact academic fields should not expand into a full ERP model unless the product scope changes.

---

# 4. Student Lifecycle

A practical operational lifecycle is:

```text
Created
   ↓
Active
   ↓
Inactive / Transferred / Graduated
```

The exact status enumeration should be finalized during implementation.

Historical operational records should remain auditable even when a student becomes inactive.

---

# 5. Student Creation

Typical flow:

```text
School Admin
      ↓
Create Student
      ↓
Validate information
      ↓
Create Student record
      ↓
Link Guardian(s) where applicable
      ↓
Create audit/activity
```

The backend must:

- validate required fields,
- enforce organization ownership,
- prevent duplicate tenant-scoped identifiers,
- apply appropriate permissions.

---

# 6. Student Search

Users with permission should be able to find students using operational identifiers.

Useful search fields include:

```text
Name
Admission number
Student identifier
Guardian name where permitted
```

Search should be:

- tenant-scoped,
- paginated,
- permission-aware,
- indexed appropriately.

Do not load the entire student population into the browser for searching.

---

# 7. Student Profile

The student detail page should provide a concise operational view.

Suggested structure:

```text
Student Profile
├── Basic Information
├── Guardian Information
├── Operational Documents
├── Notices / Relevant communication
├── Events / participation where applicable
└── Relevant operational history
```

Avoid making the profile a giant page containing every possible school ERP feature.

---

# 8. Guardian Relationship

Guardians should be modeled as relationships.

Conceptually:

```text
Student
   │
   ├── Guardian A
   ├── Guardian B
   └── ...
```

The `StudentGuardian` relationship can contain relationship-specific information where required.

Examples:

```text
relationship type
primary guardian
contact priority
```

Do not duplicate the same guardian's personal information into every student row.

---

# 9. Student Access by Role

Access should follow the permission model from `04-AUTH-RBAC-TENANCY.md`.

Examples:

### School Admin

Broad operational student access.

### Principal

Broad read/oversight access as permitted.

### Teacher

Student access may be limited to the teacher's assigned scope.

### Receptionist

Only the student information required for permitted front-desk operations.

### Maintenance Staff

Normally no broad student access unless a specific workflow requires it.

This is an example of **resource-level authorization** rather than simply role-level access.

---

# 10. Student Data Privacy

Student information is sensitive operational data.

The application should follow least privilege:

```text
User
  ↓
Permission
  ↓
Student scope
  ↓
Required fields
```

Do not expose unnecessary student information in:

- list tables,
- search results,
- notifications,
- reports,
- URLs,
- downloadable files.

---

# 11. Student Documents

Student-related documents can be generated or stored through the Document/File modules.

Examples from the product requirements include:

```text
Bonafide Certificate
Character Certificate
Student ID Card
```

The document workflow is:

```text
Select Student
     ↓
Select Template
     ↓
Resolve Student + Organization data
     ↓
Generate Document
     ↓
Store File
     ↓
Controlled Download / Print
```

Document access must remain tenant- and permission-scoped.

---

# 12. Document Generation Rules

Templates should use controlled placeholders.

Example:

```text
{{student.name}}
{{student.admissionNumber}}
{{organization.name}}
```

The backend, not the browser, should determine which records can populate the template.

The frontend may provide preview functionality, but it must not bypass backend document authorization.

---

# 13. Student ID Card Workflow

The product requirements identify **Student ID Card** as a document template.

Typical flow:

```text
Student
  ↓
Generate ID Card
  ↓
Resolve student information
  ↓
Render document
  ↓
Preview
  ↓
Print / Download
```

If QR/barcode information is added later, it should be generated through a controlled backend capability.

---

# 14. Student Notices

Students are one of the notice audience types.

Notice delivery can target:

```text
Students
Parents
Entire School
Department
```

Typical flow:

```text
Admin creates notice
      ↓
Select audience
      ↓
Attach/schedule
      ↓
Publish
      ↓
Eligible recipients see notice
      ↓
Read / acknowledge where required
```

Audience resolution must happen on the backend.

---

# 15. Notice Visibility

A notice should only appear to a student/guardian audience when the recipient belongs to the targeted scope.

Conceptually:

```text
Notice
  ↓
Audience rules
  ↓
Eligible recipients
  ↓
Notification / Notice Center
```

The frontend should not download every notice and filter it locally.

---

# 16. Student-Related Notifications

Notifications may relate to:

```text
New notice
Event reminder
Document availability
Operational request/status
Other enabled school communications
```

The notification service determines delivery channels.

The student/guardian-facing experience should only be introduced where the product explicitly supports those users as application accounts.

---

# 17. Student Complaints / Operational Requests

Depending on the configured workflow, complaints or operational requests may reference students.

For example:

```text
Issue reported for a student area/activity
Issue reported by a teacher concerning a student-related facility
```

The Complaint module remains the owner of complaint state.

Student is a related domain entity, not a reason to duplicate complaint logic inside Student.

---

# 18. Complaint Reference Flow

Example:

```text
Teacher / authorized user
       ↓
Create Complaint
       ↓
Reference relevant student/context if required
       ↓
Assign maintenance/operations staff
       ↓
Track status
       ↓
Complete / Close
```

The complaint service validates both:

```text
Complaint authorization
Student/reference authorization
```

when a student relationship exists.

---

# 19. Student Events

Students can be associated with events such as:

```text
Sports Day
PTM
Holiday
Examination
Annual Day
School meetings/events
```

The Event module owns event state.

Student participation should be modeled through the event participant capability where required.

---

# 20. Event Participation

Conceptually:

```text
Event
  ↓
Participants
  ├── Student
  ├── Staff
  └── Other supported participant types
```

The exact participant model should remain aligned with the database architecture.

Do not introduce multiple duplicated participant tables unless requirements justify them.

---

# 21. Parent-Teacher Meeting Workflow

PTM is identified as an event type.

A practical operational flow:

```text
Create PTM event
      ↓
Set date/time/venue
      ↓
Identify participants
      ↓
Publish notice/reminder
      ↓
Participants receive communication
      ↓
Event occurs
      ↓
Archive/history
```

Detailed academic meeting notes are outside the current CampusOps scope unless explicitly added.

---

# 22. Student Event Reminders

For events requiring reminders:

```text
Event
  ↓
Reminder schedule
  ↓
Notification service
  ↓
Eligible recipients
```

Reminder delivery should be idempotent so repeated scheduler execution does not create duplicate notifications.

---

# 23. Student Operational Reports

Potential student-related reports include operational information such as:

```text
Student document generation
Notice audience/read status
Event participation where supported
Student-related operational requests
```

Reports must respect:

```text
organization scope
permission scope
student/resource scope
```

Do not expose broad student datasets merely because a user can access the dashboard.

---

# 24. Academic Boundary

CampusOps deliberately does **not** require a complete academic information model.

Outside current scope:

```text
Detailed subject catalog
Curriculum management
Marks/grades engine
Report card engine
Exam result processing
Learning management
Assignment submission
Online classes
Full timetable engine
```

These may integrate with or remain inside an existing School ERP.

---

# 25. ERP Integration Boundary

CampusOps should be capable of consuming relevant student information from an existing ERP in the future.

Potential integration:

```text
Existing School ERP
       ↓
Student/Staff reference data
       ↓
CampusOps
       ↓
Operational workflows
```

Do not duplicate the entire ERP simply because CampusOps needs a student reference.

---

# 26. Student Data Synchronization — Future

If an ERP integration is introduced, synchronization should define:

```text
Source of truth
External identifier
Sync direction
Conflict handling
Create/update rules
Inactive records
Error handling
Audit trail
```

Example:

```text
ERP Student ID
      ↕
CampusOps externalReference
```

This should be designed before implementing two-way synchronization.

---

# 27. Student Import

A simpler MVP may support controlled bulk import if required.

Example:

```text
CSV/Excel
   ↓
Upload
   ↓
Validate rows
   ↓
Preview errors
   ↓
Confirm import
   ↓
Transaction/batched processing
   ↓
Import summary
```

The import must be tenant-scoped and permission-protected.

Large imports should not block an HTTP request indefinitely.

---

# 28. Student Data Validation

Important validations may include:

```text
Required name
Unique admission number within organization
Valid referenced guardian
Valid department/reference
Valid status
```

Validation rules should be centralized enough to avoid inconsistent behavior between:

```text
manual creation
bulk import
ERP synchronization
```

---

# 29. Student Deactivation

Avoid physically deleting students when historical operational records depend on them.

Prefer:

```text
Active
Inactive
```

or an equivalent lifecycle state.

Historical records such as:

```text
documents
events
complaints
audit records
```

should remain referentially understandable.

---

# 30. Student Detail Authorization

Before returning a student profile:

```text
Authenticate
    ↓
Permission check
    ↓
Tenant check
    ↓
Resource/scope check
    ↓
Return permitted fields
```

Do not rely only on:

```text
GET /students/:id
```

being hidden from the navigation.

---

# 31. Frontend Student UX

The student list should prioritize:

```text
Search
Filter
Admission number
Name
Status
Quick actions
```

The detail page should prioritize:

```text
Identity
Guardian
Documents
Relevant operational information
```

Avoid excessive tabs and information density.

---

# 32. Student Forms

Student creation/editing should use:

```text
Clearly grouped sections
Required-field indicators
Inline validation
Autocomplete for references
Confirmation before destructive actions
Unsaved-change protection where appropriate
```

Long forms should be divided logically rather than presented as one giant form.

---

# 33. Student Search UX

Search should support fast operational lookup.

For example:

```text
Admission number
       ↓
Exact/fast match
       ↓
Student profile
```

For name search:

```text
Name query
       ↓
Debounced server search
       ↓
Paginated results
```

---

# 34. Student Data in Notifications

Notification content should expose only information necessary for the action.

Prefer:

```text
"New notice available for your school."
```

over unnecessarily embedding sensitive student details.

Where a notification links to a resource, the destination endpoint must perform normal authorization again.

---

# 35. Student Data in URLs

Avoid putting sensitive information directly in URL paths or query strings.

Prefer opaque IDs:

```text
/students/<id>
```

rather than:

```text
/students/John-Doe-123456
```

The ID itself does not grant access; backend authorization is still required.

---

# 36. Auditability

Important student-related actions should be auditable where appropriate:

```text
Student created
Student updated
Guardian relationship changed
Document generated
Document downloaded where audit is required
Student deactivated
Bulk import performed
```

Audit records should not contain unnecessary sensitive data.

---

# 37. End-to-End Example — Student Document

```text
School Admin
    ↓
Open Students
    ↓
Search admission number
    ↓
Open Student
    ↓
Documents
    ↓
Generate Bonafide Certificate
    ↓
Backend validates permission + tenant
    ↓
Template resolves student data
    ↓
PDF generated
    ↓
File stored
    ↓
Document metadata saved
    ↓
Preview / Download
```

---

# 38. End-to-End Example — Student Notice

```text
School Admin
    ↓
Create Notice
    ↓
Select "Students"
    ↓
Write content
    ↓
Optional attachment
    ↓
Publish / schedule
    ↓
Backend resolves audience
    ↓
Notification / Notice Center
    ↓
Student sees eligible notice
    ↓
Read / acknowledge where required
```

---

# 39. End-to-End Example — PTM

```text
School Admin
    ↓
Create Event: PTM
    ↓
Set date/time
    ↓
Set venue
    ↓
Select participants/audience
    ↓
Publish
    ↓
Reminder
    ↓
PTM occurs
    ↓
Event completed
    ↓
History retained
```

---

# 40. End-to-End Example — Student-Related Complaint

```text
Authorized Teacher
    ↓
Create Complaint
    ↓
Select category
    ↓
Describe issue
    ↓
Reference student/context if required
    ↓
Submit
    ↓
Maintenance assignment
    ↓
IN_PROGRESS
    ↓
COMPLETED
    ↓
CLOSED
```

The complaint lifecycle remains owned by Complaints.

---

# 41. Security Checklist

For student workflows:

- [ ] Every student query is organization-scoped.
- [ ] Student list endpoints are paginated.
- [ ] Student detail endpoints enforce permissions.
- [ ] Teacher scope is enforced where applicable.
- [ ] Guardian relationships are tenant-scoped.
- [ ] Student documents require authorization.
- [ ] Notice audience is resolved server-side.
- [ ] Reports enforce student and organization scope.
- [ ] Bulk imports are permission-protected.
- [ ] Cross-tenant student IDs return no unauthorized data.
- [ ] Sensitive student data is not unnecessarily exposed in logs.

---

# 42. Implementation Checklist

### Student Core

- [ ] Student model implemented according to database architecture.
- [ ] Guardian relationships implemented.
- [ ] Tenant-scoped search.
- [ ] Student profile.
- [ ] Lifecycle/status handling.
- [ ] Permission matrix finalized.

### Documents

- [ ] Student document templates.
- [ ] Template placeholder resolution.
- [ ] PDF generation.
- [ ] Secure file access.

### Notices

- [ ] Student audience support.
- [ ] Read/acknowledgement where required.
- [ ] Notification integration.

### Events

- [ ] Student participation where required.
- [ ] PTM support.
- [ ] Event reminders.

### Integration/Future

- [ ] ERP external identifier strategy.
- [ ] Import strategy if required.
- [ ] Synchronization rules before external integration.

---

# 43. MVP vs Future

## MVP

```text
Student records
Guardian relationships
Student search
Student profile
Student operational documents
Student notice audience
Relevant events
Permission-aware access
```

## Future

```text
ERP synchronization
Bulk imports
Advanced student operational analytics
Mobile student/parent applications
Public/self-service portals
Advanced academic integrations
```

---

# 44. Final Workflow Architecture

```text
                    Student
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Guardian     Documents     Events
          │            │            │
          │            ▼            │
          │        File Service     │
          │                         │
          ▼                         ▼
       Notices ──────────────── Notifications
          │
          ▼
   Student-facing visibility
```

Student remains a core operational entity while specialized capabilities remain owned by their respective modules.

---

# 45. Summary

CampusOps should provide enough student functionality to support school operations without becoming a second full School ERP.

The core principle is:

> **Keep the Student domain focused on operational identity and relationships, while documents, notices, events, complaints, notifications, and approvals remain owned by their respective modules.**

This keeps the architecture clean and makes future ERP integration much easier.

---

**Next document:** `08-STAFF-ATTENDANCE-LEAVE.md`
