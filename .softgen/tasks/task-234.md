---
title: Large Backup Validation Upload Flow
status: done
priority: urgent
type: bug
tags: [backups, validation, upload, storage]
created_by: agent
created_at: 2026-10-21T16:59:04Z
position: 234
---

## Notes
Root cause verified: the browser path was `src/pages/admin/index.tsx` → `/api/admin/backups/initiate-validation-upload` → Supabase client `uploadToSignedUrl` against private `system-backups` → `/api/admin/backups/validate-storage-upload`. The bucket itself was verified as private with `file_size_limit=1073741824` bytes (1 GB), so the configured bucket limit was not the 66.47 MB blocker. Supabase upload guidance fetched during diagnosis recommends resumable/chunked uploads for files larger than 6 MB. The reported error occurred during Supabase Storage’s standard signed upload before validation started. The archive was not sent as JSON/base64, and `validateBackupArchive` was not reached when this upload failed.

Repair implemented: replaced the standard single-object signed upload with an app-controlled chunked staging flow. Super Admin initializes a validation upload and receives a short-lived HMAC upload token, unique private Storage prefix, expected chunk count, and 3 MB chunk size. The browser uploads each chunk to `/api/admin/backups/upload-validation-chunk`; each request stays below hosting request-body limits, and the server writes chunks to private Supabase Storage using the service role. Final validation posts the upload token to `/api/admin/backups/validate-storage-upload`, which verifies authorization, reassembles the chunks into `/tmp`, enforces size limits, runs the existing `validateBackupArchive`, returns the normal validation report, and deletes the temporary chunks in `finally`.

Security and integrity preserved: validation remains separate from restore, a successful upload is not treated as successful validation, restore is not triggered, service-role credentials are never exposed to the browser, temporary object keys are scoped to the Super Admin user ID, malformed/missing/incomplete uploads are rejected, and the existing validator still checks archive structure, safe paths, required exports, manifest identity/version/package format, record counts, and SHA-256 checksums. The documented application validation limit remains 250 MB, which supports the reported 66.47 MB backup while staying below the verified 1 GB Storage bucket limit.

Files changed: `src/lib/server/backupValidationUpload.ts`, `src/pages/api/admin/backups/initiate-validation-upload.ts`, `src/pages/api/admin/backups/upload-validation-chunk.ts`, `src/pages/api/admin/backups/validate-storage-upload.ts`, `src/pages/admin/index.tsx`, and this task file. Actual validation completed: `check_for_errors` passed with no CSS, linting, type checking, or server errors. Not executed from this environment: uploading the actual 66.47 MB production backup, intentionally corrupted checksum package, over-250 MB package, unauthorized browser session, or expired-token case. No deployment, restore, production data modification, or production backup deletion was performed.

## Checklist
- [x] Inspect backup upload UI, validation endpoint, restore endpoint, backup validator, and server backup configuration
- [x] Verify current hosting/request-size limit evidence and why the 4 MB path exists
- [x] Inspect existing Supabase Storage integration and determine secure temporary upload architecture
- [x] Implement authorized large-file upload initiation and server-side validation from temporary storage
- [x] Enforce documented maximum size, unique temporary keys, cleanup after validation/failure, and clear errors
- [x] Preserve manifest, safe path, required export, archive, and SHA-256 validation checks
- [x] Run project checks and document files changed, actual limits, and verification limits
- [x] Phase 1: Trace current browser → signed upload → validation endpoint path for the reported object-size rejection
- [x] Phase 1: Verify the exact Storage bucket limit and whether signed-upload endpoint or bucket config rejects the 66.47 MB object
- [x] Phase 1: Report root cause and proposed repair before product code changes
- [x] Phase 2: Implement smallest safe repair after root cause is established
- [x] Phase 2: Validate checks and document remaining large-file test requirements

## Acceptance
A realistic production backup around 66.47 MB can use a safe chunked upload-and-validate path without base64/JSON expansion, without weakening integrity checks, and without triggering restoration or modifying production data.