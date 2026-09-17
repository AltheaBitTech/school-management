# CampusOps — File Management MVP

## 1. Purpose
The File Management capability provides secure, tenant-scoped storage and retrieval of files used by CampusOps business modules.

It is an infrastructure capability, not a business module. Business modules must reference files through the File capability and must not directly depend on filesystem APIs.

## 2. Phase 10A Scope
Implement:
- Tenant-scoped `File` metadata
- File upload, protected download, and deletion
- Storage provider abstraction
- Local filesystem storage provider
- MIME/type and file-size validation
- Safe generated storage keys
- Authorization before metadata/storage access
- Transaction-safe metadata handling
- Audit-ready metadata
- Integration, tenant-isolation, RBAC, and storage-cleanup tests

Do not implement: PDF/document generation, templates, certificates, S3, Azure Blob, CloudFront, public URLs, image processing, virus scanning, OCR, notifications, sharing links, document workflows, or QR scanning.

## 3. Architecture
Use:
```text
Business Module
      |
      v
FileService
      |
      v
FileStorageService
      |
      v
StorageProvider interface
      |
      v
LocalFileStorageProvider
```
Business modules must never call filesystem APIs or provider SDKs directly. Providers receive server-generated storage keys, not client paths. The abstraction must permit future S3/Azure providers without changing business modules.

## 4. File Model
Create `File` with at least:
- `id`
- `organizationId`
- `originalName`
- `storageKey`
- `mimeType`
- `size`
- `checksum` (if available)
- `createdById`
- `createdAt`
- `updatedAt`

Optional: `extension`, `storageProvider`.

Do not add business-specific foreign keys such as staff/notice/leave references to File in this phase.

## 5. Tenant Isolation
Every File belongs to exactly one organization. `organizationId` comes only from authenticated server context.

A user in Organization A must never read, download, modify, or delete Organization B's File, even knowing its ID or storage key. Storage keys are never authorization credentials.

## 6. Storage Keys
Never use original filenames, client paths, or client-provided keys as physical paths.

Generate an opaque server-side key, e.g.:
```text
<organizationId>/<uuid>
```
Prevent path traversal, absolute paths, Windows drive paths, and arbitrary directory selection.

## 7. Storage Provider Contract
Provide a small provider abstraction:
```text
put(...)
get(...)
delete(...)
exists(...)   [only if required]
```
`FileStorageService` owns application workflow; the local provider owns filesystem details. Providers do not perform authorization.

## 8. Upload Flow
```text
Authenticated request
       |
       v
Authentication → RBAC → Validate multipart file
       |
       v
Generate metadata + storage key
       |
       v
Write storage
       |
       v
Create DB metadata
       |
       v
Return File DTO
```
If DB creation fails after storage succeeds, attempt to remove the orphaned physical file. Do not create metadata for failed storage writes.

## 9. Download Flow
```text
Authenticated request
       |
       v
RBAC → Tenant-scoped File lookup → Authorization
       |
       v
StorageProvider.get(storageKey)
       |
       v
Stream/download response
```
Never resolve storage from a client path or expose the local filesystem root.

## 10. Delete Flow
Delete must be tenant-scoped and authorized.

Preferred sequence:
```text
transaction
  verify File belongs to organization
  delete File metadata
commit
  |
  v
delete physical object
```
If physical deletion fails after metadata deletion, log the failure clearly for reconciliation. Do not silently ignore it. Hard deletion is acceptable for MVP unless an existing platform convention requires soft deletion.

## 11. Authorization
Use the established `resource.action` convention:
- `file.view`
- `file.create`
- `file.delete`

Use the smallest permission required by each endpoint. File permissions do not automatically bypass business-resource authorization.

## 12. API
Use `/api/v1`:
```text
POST   /api/v1/files
GET    /api/v1/files/:id
DELETE /api/v1/files/:id
```
`GET` is a protected file response, not a public URL. Follow existing authentication, RBAC, validation, exception, and response conventions.

## 13. Validation
Initial allowed types:
```text
application/pdf
image/jpeg
image/png
```
Initial maximum: **10 MB** per file.

Reject missing, zero-byte, unsupported, oversized, or unsafe uploads. Server-side limits are authoritative. Do not rely only on client MIME/filename; where practical, inspect file signatures for supported types.

## 14. Filename Handling
`originalName` is display metadata only. `storageKey` is the physical storage identifier. Preserve useful display names while rejecting unsafe path semantics.

## 15. Response DTO
May expose:
```text
id
originalName
mimeType
size
createdAt
```
Optionally checksum/extension. Never expose absolute filesystem paths, local roots, or internal provider details.

## 16. Error Handling
Recommended domain codes:
```text
FILE_NOT_FOUND
FILE_TYPE_NOT_ALLOWED
FILE_TOO_LARGE
FILE_EMPTY
FILE_STORAGE_FAILED
FILE_DELETE_FAILED
```
Tenant-isolated missing/unauthorized resources should use existing not-found semantics without revealing ownership.

## 17. Database
`File.organizationId` references `Organization` with appropriate restrictive FK behavior.

Indexes should support:
- `(organizationId, createdAt)`
- `(organizationId, id)`

If storage keys are globally unique, enforce DB uniqueness.

## 18. Consistency Rules
1. File metadata cannot belong to another organization.
2. File records cannot intentionally reference arbitrary client paths.
3. Storage failure cannot produce a successful File record.
4. DB failure after storage write triggers best-effort physical cleanup.
5. Delete cannot remove another tenant's object.
6. Download resolves storage only through trusted metadata.
7. Authorization happens before storage access.

## 19. Tests
Cover:
- valid PDF/JPEG/PNG upload
- missing/empty/unsupported/oversized/unsafe uploads
- metadata persistence and physical storage
- same-tenant authorized download
- cross-tenant and nonexistent download
- missing-storage behavior
- same-tenant delete and physical deletion
- cross-tenant/nonexistent delete
- storage-delete failure handling
- client `organizationId` cannot override tenancy
- storage key cannot access arbitrary files
- path traversal
- insufficient RBAC
- storage failure/DB failure consistency

## 20. Frontend
No large standalone file browser is required. Build only minimal UI needed to prove the capability. Business modules later consume File APIs through their feature clients.

## 21. Existing Schema Integration
The current architecture contains references such as:
- `Staff.photoFileId`
- `LeaveRequest.attachmentFileId`

Introduce the File model and correct relationships where explicitly required by the current schema. Do not redesign Staff or Leave or force every future module into File.

## 22. Security Rules
Non-negotiable:
- Never trust client `organizationId`
- Never trust client storage paths
- Never use original filenames as physical paths
- Never expose filesystem paths
- Never authorize using only File ID
- Never access storage before authorization
- Never allow cross-tenant access
- Never allow path traversal
- Never make frontend the security boundary

## 23. Non-Goals
Deferred: S3, Azure Blob, CloudFront, public/signed URLs, image transformations, OCR, virus scanning, document generation/templates/certificates, notifications, sharing links, versioning, cross-tenant deduplication, retention/legal hold, advanced media processing.

## 24. Definition of Done
Phase 10A is complete when the File model/migration, local provider, abstraction, upload/download/delete, tenant isolation, RBAC, validation, storage/DB consistency, security tests, and full project verification all pass; hardening finds no critical/high security or data-integrity issues; changes are committed and pushed.

## 25. Implementation Sequence
1. Prisma File model + migration
2. StorageProvider interface
3. LocalFileStorageProvider
4. FileService
5. Controller + DTOs
6. RBAC
7. Upload/download/delete
8. Integration tests
9. Minimal frontend proof if needed
10. Hardening review
11. Hardening fixes
12. Full verification
13. Commit
14. Push

After Phase 10A, Phase 10B builds Document Templates and Document Generation on top of File capability.
