# CampusOps — Cursor Development System

This `.cursor` setup is the AI-assisted engineering playbook for CampusOps.

## Purpose

Cursor should use the repository documentation and these rules to implement features consistently rather than inventing architecture per task.

## Repository structure

```text
apps/api   = NestJS backend
apps/web   = Next.js frontend
```

Permission identifiers use the `resource.action` format, for example `staff.view`, `leave.approve`, and `complaint.create`.

## Source of truth

Priority:

1. Current repository code and tests
2. `docs/00-IMPLEMENTATION-BLUEPRINT.md`
3. Relevant domain/architecture document
4. Relevant API/database/security documentation
5. Existing established code patterns
6. General engineering judgment

If sources conflict, stop and identify the conflict rather than silently inventing a new pattern.

## Working principle

Every meaningful feature follows:

Requirement
→ Domain
→ Database
→ Backend
→ API
→ Authorization
→ Frontend
→ Audit/Notifications
→ Tests
→ Review

## Before changing code

- Inspect the relevant existing module.
- Search for reusable patterns.
- Read the relevant docs.
- Identify affected modules.
- Identify security and tenant boundaries.
- State assumptions when requirements are incomplete.

## Never

- Invent a second architecture.
- Trust client `organizationId` for authorization.
- Put complex Prisma logic in controllers.
- Skip authorization because the UI hides an action.
- Publicly expose protected files.
- Add infrastructure without a demonstrated need.
- Mark CRUD as complete when the workflow is incomplete.
