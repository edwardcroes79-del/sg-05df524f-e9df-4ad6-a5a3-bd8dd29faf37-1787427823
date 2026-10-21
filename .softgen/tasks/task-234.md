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
Reopened for investigation after the Super Admin backup page reported `Validation failed — The object exceeded the maximum allowed size` while uploading a valid approximately 66.47 MB `.tar.gz` backup through the staged Storage upload path. Phase 1 requirement: diagnose and report the exact layer and configured limit before changing code. Previous implementation used Supabase Storage signed upload URL under `system-backups/validation-uploads/{adminUserId}/...`, then server-side validation from the staged object. No restore, deployment, production data modification, or cleanup deletion outside temporary validation objects is authorized during diagnosis.

## Checklist
- [x] Inspect backup upload UI, validation endpoint, restore endpoint, backup validator, and server backup configuration
- [x] Verify current hosting/request-size limit evidence and why the 4 MB path exists
- [x] Inspect existing Supabase Storage integration and determine secure temporary upload architecture
- [x] Implement authorized large-file upload initiation and server-side validation from temporary storage
- [x] Enforce documented maximum size, unique temporary keys, cleanup after validation/failure, and clear errors
- [x] Preserve manifest, safe path, required export, archive, and SHA-256 validation checks
- [x] Run project checks and document files changed, actual limits, and verification limits
- [ ] Phase 1: Trace current browser → signed upload → validation endpoint path for the reported object-size rejection
- [ ] Phase 1: Verify the exact Storage bucket limit and whether signed-upload endpoint or bucket config rejects the 66.47 MB object
- [ ] Phase 1: Report root cause and proposed repair before product code changes
- [ ] Phase 2: Implement smallest safe repair after root cause is established
- [ ] Phase 2: Validate checks and document remaining large-file test requirements

## Acceptance
A realistic production backup around 66.47 MB can use a safe large-file upload-and-validate path without base64/JSON expansion, without weakening integrity checks, and without triggering restoration or modifying production data.