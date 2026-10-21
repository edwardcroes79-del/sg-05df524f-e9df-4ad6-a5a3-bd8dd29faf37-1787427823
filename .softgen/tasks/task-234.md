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
Implement a safe large-file upload path for backup validation after the direct Next.js API upload path rejected a valid 66.47 MB Royalty Stamp `.tar.gz` backup due to the current 4 MB app limit created to stay below Vercel function request-size limits. Diagnose existing upload UI, validation endpoint, hosting/proxy request-size limits, temporary-file handling, object-storage support, authorization, and archive validation logic. Prefer a secure direct-to-object-storage upload using Supabase Storage or an existing supported upload mechanism, then validate server-side from trusted storage without exposing service-role credentials or bypassing integrity checks. Keep validation separate from restore; never auto-restore after upload or validation.

## Checklist
- [ ] Inspect backup upload UI, validation endpoint, restore endpoint, backup validator, and server backup configuration
- [ ] Verify current hosting/request-size limit evidence and why the 4 MB path exists
- [ ] Inspect existing Supabase Storage integration and determine secure temporary upload architecture
- [ ] Implement authorized large-file upload initiation and server-side validation from temporary storage
- [ ] Enforce documented maximum size, unique temporary keys, cleanup after validation/failure, and clear errors
- [ ] Preserve manifest, safe path, required export, archive, and SHA-256 validation checks
- [ ] Run project checks and document files changed, actual limits, and verification limits

## Acceptance
A realistic production backup around 66.47 MB can use a safe large-file upload-and-validate path without base64/JSON expansion, without weakening integrity checks, and without triggering restoration or modifying production data.