---
title: Large Backup Validation Upload Flow
status: in_progress
priority: urgent
type: bug
tags: [backups, validation, upload, storage]
created_by: agent
created_at: 2026-10-21T16:59:04Z
position: 234
---

## Notes
Reopened for investigation after the Super Admin backup page reported `Validation failed — The object exceeded the maximum allowed size` while uploading a valid approximately 66.47 MB `.tar.gz` backup through the staged Storage upload path. Phase 1 evidence: the browser path was `src/pages/admin/index.tsx` → `/api/admin/backups/initiate-validation-upload` → Supabase client `uploadToSignedUrl` against private `system-backups` → `/api/admin/backups/validate-storage-upload`. The bucket itself was verified as private with `file_size_limit=1073741824` bytes (1 GB), so the configured bucket limit is not 66.47 MB. Supabase upload guidance fetched during diagnosis distinguishes standard uploads from resumable uploads and recommends resumable uploads for files larger than 6 MB. The reported error occurs during the standard signed upload before validation starts. Root cause: the implementation used Supabase Storage’s standard signed upload path for a production-size backup; that path is not appropriate for 66.47 MB validation packages even though the bucket limit is larger. The package is not sent as JSON/base64 and the archive validator is not reached when this upload fails.

Phase 2 repair in progress: replace the standard single-object signed upload with an app-controlled chunked staging flow. Super Admin initializes a validation upload and receives a short-lived HMAC upload token, unique private Storage prefix, expected chunk count, and 3 MB chunk size. The browser uploads each chunk to a Super Admin-authorized API endpoint; each request stays below hosting body-size limits, the server writes chunks to private Supabase Storage with the service role, and final validation will reassemble chunks into `/tmp` before running the existing `validateBackupArchive`. The documented app limit remains 250 MB. Validation remains separate from restore; no restore, deployment, production data modification, or broad data deletion is performed.

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
- [ ] Phase 2: Implement smallest safe repair after root cause is established
- [ ] Phase 2: Validate checks and document remaining large-file test requirements

## Acceptance
A realistic production backup around 66.47 MB can use a safe large-file upload-and-validate path without base64/JSON expansion, without weakening integrity checks, and without triggering restoration or modifying production data.