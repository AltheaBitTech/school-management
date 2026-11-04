# Phase 4 — Document Templates: All 7 Templates with Professional PDF Output
# Run this with Composer 2.5

## Goal
Implement all 7 document templates from the BRD with properly formatted, pre-filled PDFs.
PDFs must look professional with school branding (logo placeholder), not plain text dumps.
Library: `pdfkit` (already installed in `apps/api`).

## Context
- PDF generator: `apps/api/src/documents/services/pdf-generator.service.ts` (currently basic title+body only)
- Template constants: `apps/api/src/documents/constants/document.constants.ts`
- Template seed: `apps/api/src/documents/utils/document-template-seed.util.ts`
- Documents service: `apps/api/src/documents/documents.service.ts`
- Prisma enum: `DocumentType` — currently only `BONAFIDE_CERTIFICATE`
- Document owner types: `DocumentOwnerType` — currently `STUDENT`

---

## Task 1 — Extend Prisma Schema

Add new DocumentType enum values in `apps/api/prisma/schema.prisma`:
```
enum DocumentType {
  BONAFIDE_CERTIFICATE
  CHARACTER_CERTIFICATE
  EXPERIENCE_LETTER
  SALARY_CERTIFICATE
  VISITOR_PASS
}
```

Note: Employee ID Card and Student ID Card are deferred to a later phase (require image/photo layout complexity).

Add new DocumentOwnerType:
```
enum DocumentOwnerType {
  STUDENT
  STAFF
  VISITOR
}
```

Create a migration: `pnpm --filter @campusops/api prisma:migrate:dev -- --name add-document-types`

---

## Task 2 — Professional PDF Generator

Rewrite `apps/api/src/documents/services/pdf-generator.service.ts` to generate visually structured PDFs.

Design standard for all templates:
- Page: A4, margins 60px all sides
- Header section (top of every page):
  - Left: School icon circle (draw a filled circle with "🏫" text or institution initial, since no image file yet)
  - Center: Organization name in bold 18pt
  - Center sub: Organization address placeholder or city (from org settings if available)
  - Bottom of header: horizontal rule
- Body section: document-specific content
- Footer:
  - Left: "Generated on [date]" in small grey text
  - Right: "Document ID: [docId]" in small grey text
  - Top of footer: horizontal rule
  - Center bottom: "This is a computer-generated document and does not require a signature unless specified."

Export a function per template type rather than one generic function:

```typescript
export async function generateBonafidePdf(data: BonafideData): Promise<Buffer>
export async function generateCharacterCertificatePdf(data: CharacterData): Promise<Buffer>
export async function generateExperienceLetterPdf(data: ExperienceData): Promise<Buffer>
export async function generateSalaryCertificatePdf(data: SalaryData): Promise<Buffer>
export async function generateVisitorPassPdf(data: VisitorPassData): Promise<Buffer>
```

### Data types for each template:

```typescript
interface CommonDocumentData {
  organization: { name: string; city?: string; phone?: string; email?: string };
  generatedDate: string; // formatted date string
  documentId: string;
}

interface BonafideData extends CommonDocumentData {
  student: { name: string; admissionNumber: string; class?: string; section?: string; academicYear?: string };
  purpose?: string;
}

interface CharacterData extends CommonDocumentData {
  student: { name: string; admissionNumber: string; class?: string; conduct: string; attendancePercentage?: string };
  purpose?: string;
}

interface ExperienceData extends CommonDocumentData {
  staff: { name: string; designation: string; department: string; joiningDate: string; leavingDate?: string; employeeCode: string };
  relievingReason?: string;
}

interface SalaryData extends CommonDocumentData {
  staff: { name: string; designation: string; department: string; employeeCode: string; monthlySalary: string; salaryMonth: string };
  purpose?: string;
}

interface VisitorPassData extends CommonDocumentData {
  visitor: { name: string; mobile: string; organization?: string; purpose: string; host: string; checkInTime: string; validUntil: string; visitorId: string };
}
```

### PDF layout per template:

**Bonafide Certificate:**
```
[HEADER: school name, icon]
─────────────────────────────
        BONAFIDE CERTIFICATE
        (centered, uppercase, 16pt bold, with bottom border)

To Whom It May Concern,

This is to certify that [Student Name], bearing Admission No. [admissionNumber],
is a bonafide student of [School Name].

[If class available]:
The student is currently studying in Class [class] [section], Academic Year [year].

This certificate is issued on [date] for the purpose of [purpose / "official purposes"].

[SIGNATURE BLOCK — right aligned]
  Authorized Signatory
  [Organization Name]

[FOOTER: generated date + doc ID]
```

**Character Certificate:**
Similar structure. State conduct rating (Good/Excellent/Outstanding).

**Experience Letter:**
Formal letter format. To Whom It May Concern. States name, designation, department, period of employment. Professional closure.

**Salary Certificate:**
States employee name, designation, monthly salary in words and numbers, for the month of [month].

**Visitor Pass:**
Different layout — more like a card:
- Large "VISITOR PASS" header in primary blue
- Name big and bold
- Host, Purpose, Check-in time in two-column layout
- Valid Until in red/warning color
- Visitor ID as a reference number
- "Present this pass at reception on exit" note at bottom

---

## Task 3 — Update Template Constants & Seed

In `apps/api/src/documents/constants/document.constants.ts`:
- Add template definitions for each new type (name, content, version)
- Content JSON stores the template type and any org-specific instructions

Update `apps/api/src/documents/utils/document-template-seed.util.ts`:
- Add upsert calls for all 5 template types
- Function name: `ensureDefaultDocumentTemplates` — add all types here

---

## Task 4 — Update Documents Service

In `apps/api/src/documents/documents.service.ts`:
- Handle new `DocumentOwnerType.STAFF` — resolve staff data for experience/salary letters
- Handle `DocumentOwnerType.VISITOR` — resolve visitor data for visitor pass
- Route to the correct PDF generator function based on `documentType`
- Populate all template variables from the resolved entity (student/staff/visitor)
- Validate: salary certificate requires salary amount (if not stored, accept as a request param)

Add new `GenerateDocumentDto` fields:
```typescript
// Optional context fields for generation
purpose?: string;        // for bonafide/character
salaryAmount?: number;   // for salary certificate (if not stored on staff)
salaryMonth?: string;    // for salary certificate (YYYY-MM format)
relievingReason?: string; // for experience letter
leavingDate?: string;    // for experience letter
```

---

## Task 5 — Frontend: Document Generator UI

Update `apps/web/src/app/(app)/documents/generate/page.tsx`:

- Show all 5 template types as selectable cards (icon, name, description, owner type badge)
- On selection, show a form with the required fields:
  - Bonafide / Character: student search/select (autocomplete), purpose field
  - Experience / Salary: staff search/select (autocomplete), additional fields per type
  - Visitor Pass: visitor search/select or enter manually
- Preview button (optional) + Generate button
- After generation: show success with "Download PDF" button

Update `apps/web/src/app/(app)/documents/page.tsx`:
- List shows document type with a colored chip per type
- Type filter dropdown includes all 5 types

---

## Acceptance Criteria
- [ ] 5 document types exist in Prisma schema
- [ ] Generating a Bonafide Certificate produces a properly formatted PDF (not plain text)
- [ ] PDF has school name in header, proper certificate body, footer with doc ID + date
- [ ] Experience Letter and Salary Certificate work for staff entity
- [ ] Visitor Pass works for visitor entity
- [ ] All templates are seeded per organization
- [ ] Document generator UI lists all 5 types with selection form
- [ ] `pnpm --filter @campusops/api typecheck` passes
- [ ] Migration runs cleanly
