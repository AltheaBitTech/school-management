# Phase 8 — Template text editor and ID card layout
# Implement this phase only. Spec: `docs/23-REMAINING-WORK-PLAN.md`.

## Goal

Let a school admin edit certificate wording and a few ID card layout options. PDF generation stays on pdfkit.

## Templates

`DocumentTemplate.content` is a JSON string. `parseDocumentTemplateContent` requires `{ title: string, body: string }`.

Before editing, read `documents.service.ts` and `pdf-generator.service.ts` and save the shape those functions already read. If seeded content is `{ documentType, title, instructions }` and the generator ignores `body`, adapt the editor to the shape the generator uses. Do not add a second template language.

- New permission: `document.template.update`. Grant it to `SCHOOL_ADMIN` only. Re-seed with the existing org-role seed.
- `GET /documents/templates` — `document.view` — list this org’s templates (type, name, version, title, body or the live fields).
- `PATCH /documents/templates/:documentType` — `document.template.update` — updates that org’s row.
- On save, increment `version`. Previously generated documents keep their `templateVersion` and file.
- Allow only placeholders listed in `ALLOWED_TEMPLATE_VARIABLES`. Reject unknown `{{tokens}}` with 400.
- One template per organization and document type (unique constraint already exists). Resolve the row inside the caller’s organization.

Editor UI: `/documents/templates` and `/documents/templates/[documentType]`. `FormPageShell`, title field, body field, a read-only list of allowed placeholders. Snackbar on save.

ID card types (`STUDENT_ID_CARD`, `STAFF_ID_CARD`) and `VISITOR_PASS` are layout-driven. Do not offer a free body editor for those three. They use the layout settings below.

## ID card layout

Store flags on the existing `OrganizationSettings.documentSettings` JSON:

```json
{
  "idCard": {
    "showPhoto": true,
    "showCode": true,
    "footerLine": "Valid for the current academic year"
  }
}
```

- `GET` and `PATCH /organizations/current/document-settings` with `organization.settings.update`.
- `footerLine` max 80 characters. Booleans default to true when the JSON is null.
- `generateIdCardPdf` reads these flags. Missing JSON keeps today’s layout.
- Settings UI: `/settings/documents` with the same form shell as `/settings/logo`. Include a “Download sample” action that calls the existing ID card generation for one student or staff member the user can already access.

No color picker, no drag-and-drop, no HTML templates.

## Tests

- Unknown placeholder → 400.
- Org A cannot patch Org B’s template (404 or 403).
- Saving a template bumps `version` and does not change an already generated file id.
- ID card PDF still generates when `documentSettings` is null.
- User without `document.template.update` → 403.

## Out of scope

A visual canvas, per-student layout, emailing the PDF.

## Done when

- An admin can change a certificate title/body and the next generated PDF uses it.
- ID card photo/code/footer follow the saved flags.
- API and web typecheck pass, plus the document tests above.
