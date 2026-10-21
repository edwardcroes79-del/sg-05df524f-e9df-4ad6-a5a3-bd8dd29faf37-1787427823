---
title: Large Backup Validation Upload Flow
status: in_progress
priority: urgent
type: feature
tags: [backups, validation, upload, storage]
created_by: agent
created_at: 2026-10-21T16:59:04Z
position: 234
---

## Notes
Implement a safe large-file upload path for backup validation after the direct Next.js API upload path rejected a valid 66.47 MB Royalty Stamp `.tar.gz` backup due to the current 4 MB app limit created to stay below Vercel function request-size limits. Diagnosis from current files: `src/pages/admin/index.tsx` enforced the 4 MB limit before fetch, and `src/pages/api/admin/backups/validate-upload.ts` streamed raw request bodies through a Next.js API route with `bodyParser: false`. The archive was not sent as JSON/base64, but any direct API request body still goes through hosting function request-size limits. Existing backups already use Supabase Storage bucket `system-backups` through `src/lib/server/backupConfig.ts` and server-side service-client Storage access. The validator in `src/lib/server/backupValidator.ts` already validates gzip/tar structure, safe paths, required tables/buckets, manifest identity/version/package format, record counts, and SHA-256 checksums.

Implemented staged large validation upload: Super Admin requests a signed Supabase Storage upload URL for a unique temporary key under `validation-uploads/{adminUserId}/...`; browser uploads the raw file directly to Storage using `uploadToSignedUrl`; then the Super Admin asks the server to download that exact owned temporary object to `/tmp`, enforce size, run the existing `validateBackupArchive`, return the normal validation report, and remove the temporary object in `finally`. This avoids base64/JSON expansion and avoids sending the archive through the Vercel function request body. The documented application validation limit is now 250 MB, which supports the reported 66.47 MB backup while keeping memory/tmp usage bounded. Restore behavior remains unchanged and is not triggered by upload or validation.

## Checklist
- [x] Inspect backup upload UI, validation endpoint, restore endpoint, backup validator, and server backup configuration
- [x] Verify current hosting/request-size limit evidence and why the 4 MB path exists
- [x] Inspect existing Supabase Storage integration and determine secure temporary upload architecture
- [x] Implement authorized large-file upload initiation and server-side validation from temporary storage
- [x] Enforce documented maximum size, unique temporary keys, cleanup after validation/failure, and clear errors
- [x] Preserve manifest, safe path, required export, archive, and SHA-256 validation checks
- [ ] Run project checks and document files changed, actual limits, and verification limits

## Acceptance
A realistic production backup around 66.47 MB can use a safe large-file upload-and-validate path without base64/JSON expansion, without weakening integrity checks, and without triggering restoration or modifying production data.