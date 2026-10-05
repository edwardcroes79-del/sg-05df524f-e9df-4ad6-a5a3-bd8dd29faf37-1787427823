---
title: Tar.gz backup upload fix
status: done
priority: urgent
type: bug
tags: [backup, upload, validation, mobile]
created_by: agent
created_at: 2026-10-05T18:34:11Z
position: 120
---

## Notes
Investigated and fixed the Upload & Validate Backup rejection for real Royalty Stamp backups on Samsung Browser/mobile. The user-visible error was `Invalid file type Upload a Royalty Stamp .tar.gz backup package.`

Actual rejection cause: the visible error was thrown in `src/pages/admin/index.tsx` before any network request when `!file.name.endsWith(".tar.gz")`. This was a strict suffix check that rejected valid Royalty Stamp backup filename variants before `file.type`, upload `Content-Type`, or server-side archive validation could run.

Smallest safe fix:
- Client now accepts filenames containing `.tar.gz` and does not rely solely on browser-reported MIME type.
- Client records upload diagnostics in rejection messages.
- Upload request supports `application/gzip`, `application/x-gzip`, `application/octet-stream`, and empty browser MIME values by sending a safe request `Content-Type`.
- Server validation endpoint accepts plausible Royalty Stamp `.tar.gz` filenames plus allowed gzip/octet-stream/tar content types, then relies on server-side gzip/tar/manifest/version/checksum validation as the authority.
- Validator preserves existing manifest, backup version, checksum, safe path, and Royalty Stamp backup identity checks.
- No restore behavior, production data modification, backup format change, or authorization weakening was introduced.

Real generated backup test:
- `file.name`: `royalty-stamp-backup-2026-10-05T18-28-56-653Z-77f51092-725c-4b90-89f1-acb10af65e88.tar.gz`
- `file.type`: `application/gzip` in the Node smoke test. Samsung Browser’s actual MIME value cannot be observed from this server sandbox, but the fixed code accepts the required Samsung/mobile possibilities: `application/gzip`, `application/x-gzip`, `application/octet-stream`, and empty string.
- `file.size`: `59,335,969` bytes.
- Upload request Content-Type support verified for `application/gzip`, `application/x-gzip`, `application/octet-stream`, and empty browser MIME mapped to `application/octet-stream`.
- The real generated backup was reconstructed from private `system-backups` Storage, SHA-256 matched metadata, reached server-side validation, and passed validation.
- Validation report: version `2026-10-05.phase2`, 25 tables, 2 buckets, 1,244 records, 103 files, no validation errors.
- Final project validation passed with no CSS, linting, TypeScript, or server errors.

Files changed:
- `src/pages/admin/index.tsx`
- `src/pages/api/admin/backups/validate-upload.ts`
- `src/lib/server/backupValidator.ts`

## Checklist
- [x] Inspect upload UI client-side file checks and request headers
- [x] Inspect validation API upload size/body handling and content-type assumptions
- [x] Inspect validator gzip/tar/manifest/checksum safety behavior
- [x] Identify actual rejection reason for generated Royalty Stamp backup upload
- [x] Apply smallest safe fix to accept generated `.tar.gz` backups from mobile browsers
- [x] Test real generated backup reaches server-side validation stage
- [x] Run project validation
- [x] Report file name/type/size evidence, rejection cause, files changed, and test result

## Acceptance
A real Royalty Stamp backup file of at least 56.59 MB can be uploaded and reaches validation.
Unrelated file types and unsafe archives remain rejected by server-side validation.
No restore or production data modification is introduced.