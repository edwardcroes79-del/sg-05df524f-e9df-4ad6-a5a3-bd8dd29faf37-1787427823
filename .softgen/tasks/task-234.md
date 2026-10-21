---
title: Large Backup Validation Upload Flow
status: done
priority: urgent
type: feature
tags: [backups, validation, upload, storage]
created_by: agent
created_at: 2026-10-21T16:59:04Z
position: 234
---

## Notes
Implemented a safe large-file upload path for backup validation after the direct Next.js API upload path rejected a valid 66.47 MB Royalty Stamp `.tar.gz` backup due to the previous 4 MB app limit created to stay below Vercel function request-size limits. Diagnosis from current files: `src/pages/admin/index.tsx` enforced the 4 MB limit before fetch, and `src/pages/api/admin/backups/validate-upload.ts` streamed raw request bodies through a Next.js API route with `bodyParser: false`. The archive was not sent as JSON/base64, but any direct API request body still goes through hosting function request-size limits. Existing backups already use Supabase Storage bucket `system-backups` through `src/lib/server/backupConfig.ts` and server-side service-client Storage access. The validator in `src/lib/server/backupValidator.ts` already validates gzip/tar structure, safe paths, required tables/buckets, manifest identity/version/package format, record counts, and SHA-256 checksums.

Implemented staged large validation upload: Super Admin requests a signed Supabase Storage upload URL for a unique temporary key under `validation-uploads/{adminUserId}/...`; browser uploads the raw file directly to Storage using `uploadToSignedUrl`; then the Super Admin asks the server to download that exact owned temporary object to `/tmp`, enforce size, run the existing `validateBackupArchive`, return the normal validation report, and remove the temporary object in `finally`. This avoids base64/JSON expansion and avoids sending the archive through the Vercel function request body. The server streams the staged object from a short-lived Storage signed download URL into a temp file so validation does not buffer the full archive in memory. The documented application validation limit is now 250 MB, which supports the reported 66.47 MB backup while keeping memory/tmp usage bounded. Verified Supabase Storage bucket `system-backups` has `file_size_limit=1073741824` bytes (1 GB), is private, and allows `application/gzip`, `application/x-gzip`, and `application/octet-stream`; therefore the new 250 MB app limit is below the actual bucket limit. Restore behavior remains unchanged and is not triggered by upload or validation.

Files changed: `src/pages/admin/index.tsx`, `src/pages/api/admin/backups/initiate-validation-upload.ts`, `src/pages/api/admin/backups/validate-storage-upload.ts`, and this task file. Actual validation completed: `check_for_errors` passed with no CSS, linting, type checking, or server errors. Verified database/storage configuration: `system-backups` is private with a 1 GB object limit and compatible MIME types. Not executed in-browser from this environment: uploading the real 66.47 MB backup, uploading a package at 250 MB, uploading a package over 250 MB, testing an expired signed upload URL, or validating intentionally corrupted/checksum-invalid archives. No deployment, restore, production data modification, or backup deletion was performed.

## Checklist
- [x] Inspect backup upload UI, validation endpoint, restore endpoint, backup validator, and server backup configuration
- [x] Verify current hosting/request-size limit evidence and why the 4 MB path exists
- [x] Inspect existing Supabase Storage integration and determine secure temporary upload architecture
- [x] Implement authorized large-file upload initiation and server-side validation from temporary storage
- [x] Enforce documented maximum size, unique temporary keys, cleanup after validation/failure, and clear errors
- [x] Preserve manifest, safe path, required export, archive, and SHA-256 validation checks
- [x] Run project checks and document files changed, actual limits, and verification limits

## Acceptance
A realistic production backup around 66.47 MB can use a safe large-file upload-and-validate path without base64/JSON expansion, without weakening integrity checks, and without triggering restoration or modifying production data.