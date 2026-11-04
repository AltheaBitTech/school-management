# Phase 5 — Visitor QR Pass + Fees & Students Best Practices
# Run this with Composer 2.5

---

## Pre-flight fixes (from Phase 3 / Phase 4 review)

**Fix 1 — Visitor pass after checkout (Phase 4 follow-up):** In `apps/api/src/documents/documents.service.ts`, in the `VISITOR_PASS` case, allow both `CHECKED_IN` and `CHECKED_OUT` so passes can be generated/reprinted from visitor detail (including after checkout):

```typescript
if (
  visitor.status !== VisitorStatus.CHECKED_IN &&
  visitor.status !== VisitorStatus.CHECKED_OUT
) {
  throw new BadRequestException({ ... });
}
```

**Fix 2 — Invite login org code (Phase 3 follow-up):** Verify `apps/web/src/app/(auth)/reset-password/page.tsx` forwards `orgCode` on invite success to `/login?passwordSet=1&orgCode=...` (login page already pre-fills from `orgCode`). Implement only if missing.

---

## Part A — Visitor QR Pass on Check-in

### Goal
After a visitor checks in, generate and display a printable visitor pass with a QR code.
The QR code encodes the visitor's session ID for quick identity verification.

### Library
Install `qrcode` (server-side) in the API: `pnpm --filter @campusops/api add qrcode @types/qrcode`
For frontend display, use the generated QR as a data URL image.

### Backend changes

**New endpoint:** `GET /visitors/:id/pass`
- Requires `visitor.view` permission
- Resolves visitor by ID within the organization
- Generates a QR code data URL encoding: `CAMPUSOPS-VISITOR-{visitorId}-{checkInTimestamp}`
- Returns:
  ```typescript
  {
    visitor: { name, mobile, organization, purpose, host, checkInTime, vehicleNumber },
    organization: { name, city },
    qrCodeDataUrl: string, // base64 data URL
    passGeneratedAt: string,
  }
  ```
- If visitor is already checked out, still allow pass download (for records)

### Frontend changes

**On `apps/web/src/app/(app)/visitors/[id]/page.tsx`:**
- Add a "Print Visitor Pass" button (visible when visitor status is CHECKED_IN)
- Clicking it opens a print dialog or opens `/visitors/[id]/pass` in a new tab

**New page:** `apps/web/src/app/(app)/visitors/[id]/pass/page.tsx`
- Fetches pass data from API
- Renders a printable visitor pass layout using MUI Paper:
  - Top: School name + CampusOps header (navy blue background, white text)
  - Large "VISITOR PASS" label
  - Two-column layout: visitor details left, QR code right
  - Visitor details: Name (large bold), Host, Purpose, Mobile, Check-in time, Vehicle no.
  - QR code: 120x120px, rendered as `<img src={qrCodeDataUrl} />`
  - Footer: "Valid for today only · {Date}" + org name
- "Print" button using `window.print()`
- CSS: `@media print` hides the Print button and AppShell nav, shows only the pass

---

## Part B — Fees & Students: Best Practice Improvements

### Current gaps vs real school apps

Real school fee management (Teachmint, Classpro, Fedena) includes:
1. Fee structures tied to class/grade (not just a flat structure)
2. Installment schedule (Term 1, Term 2, Term 3)
3. Payment receipt PDF download
4. Outstanding dues visible to student self-service
5. Concession/scholarship tracking (future)

Real student profiles include:
1. Class + Section (e.g., "Grade 8 - Section A")
2. Admission number (unique, auto-generated or manual)
3. Academic year context
4. Guardian name + phone
5. Student status: Active, Passed Out, Transferred

### Backend Changes — Students

In `apps/api/prisma/schema.prisma`, add to Student model:
```
class        String?
section      String?
rollNumber   String?
guardianName String?
guardianPhone String?
academicYear String?   // e.g., "2025-2026"
```

Create migration: `prisma:migrate:dev -- --name add-student-class-section`

Update `apps/api/src/students/` service and DTOs to include new fields.

In `apps/api/src/students/dto/create-student.dto.ts` and `update-student.dto.ts`:
- Add `class`, `section`, `rollNumber`, `guardianName`, `guardianPhone`, `academicYear`
- Add validation: class max 20 chars, section max 10 chars, rollNumber max 20 chars

### Backend Changes — Fees

**Payment Receipt PDF**

Add new endpoint: `GET /fees/student-fees/:id/payments/:paymentId/receipt`
- Requires `fee.record_payment` or `student.self.fee.receipt.download` permission
- Generates a payment receipt PDF using pdfkit
- Receipt includes:
  - School name + logo placeholder (header)
  - "PAYMENT RECEIPT" title
  - Receipt number (payment ID or sequential number)
  - Student name, class, admission number
  - Fee description (structure name)
  - Amount paid, payment method, payment date
  - Remaining balance
  - Footer: "This is a computer-generated receipt"

**Fee Structure — add installments concept (simple version)**

In `apps/api/prisma/schema.prisma`, add to `FeeStructure` model:
```
installmentLabel String?  // e.g., "Annual", "Term 1", "Term 2", "Term 3"
dueDate          DateTime? // when this fee is due
academicYear     String?  // e.g., "2025-2026"
```

Create migration.

### Frontend Changes — Students

Update `apps/web/src/app/(app)/students/new/page.tsx` and edit page:
- Add fields: Class, Section, Roll Number, Guardian Name, Guardian Phone, Academic Year
- Group fields: "Academic Details" section + "Guardian Details" section

Update `apps/web/src/app/(app)/students/[id]/page.tsx`:
- Show class, section, roll number, academic year prominently (not buried)
- Show guardian info in a separate card

Update `apps/web/src/app/(app)/students/page.tsx` (list):
- Add "Class" column to the table
- Add "Class" filter dropdown

### Frontend Changes — Fees

Update `apps/web/src/app/(app)/fees/student-fees/[id]/page.tsx`:
- For each payment record, add a "Download Receipt" button
- Clicking it triggers `GET /fees/student-fees/:id/payments/:paymentId/receipt` → download PDF

Update `apps/web/src/app/(app)/fees/structures/page.tsx`:
- Show `installmentLabel` and `dueDate` columns
- Add installment label field in the fee structure creation form

### Student Self-Service Portal

If a STUDENT role user logs in (has `student.self.view` permission), they should see:
- Their own profile information
- Their fee status and payment history (from the existing student fees endpoints, scoped to their student record)
- Download receipt for each payment
- Download certificates (bonafide, character) from the documents section

In the AppShell, when user has `student.self.view` but NOT `dashboard.view`, show:
```
STUDENT_SELF_NAV_GROUP: {
  title: 'My Portal',
  items: [
    { href: '/student/profile', label: 'My Profile', icon: PersonOutlined, requiredPermission: 'student.self.view' },
    { href: '/student/fees', label: 'My Fees', icon: ReceiptLongOutlined, requiredPermission: 'student.self.fee.view' },
    { href: '/notices', label: 'Notices', icon: AnnouncementOutlined, requiredPermission: 'notice.view' },
    { href: '/events', label: 'Events', icon: CalendarMonthOutlined, requiredPermission: 'event.view' },
  ]
}
```

Create student self-service pages:
- `apps/web/src/app/(app)/student/profile/page.tsx` — view own student profile (read-only)
- `apps/web/src/app/(app)/student/fees/page.tsx` — view own fee dues + payment history + download receipts

These pages call the existing student/fees APIs, scoped to the logged-in student's linked student record.
(Requires the backend to resolve student by the logged-in user's linked studentId.)

Add `studentId` to the user session/me response if the user has `student.self.view` permission.

---

## Acceptance Criteria
- [ ] Visitor pass page shows QR code + all visitor details formatted cleanly
- [ ] "Print Visitor Pass" button opens printable page, print hides nav
- [ ] Student profile has class, section, guardian fields
- [ ] Fee payment receipt PDF downloads correctly
- [ ] Student list has Class column + Class filter
- [ ] Student self-service nav appears for STUDENT role users
- [ ] Student can view own fees and download receipts
- [ ] `pnpm --filter @campusops/api typecheck` passes
- [ ] `pnpm --filter @campusops/web typecheck` passes
