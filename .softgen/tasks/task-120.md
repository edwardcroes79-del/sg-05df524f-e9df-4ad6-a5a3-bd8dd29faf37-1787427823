---
title: Tar.gz backup upload fix
status: in_progress
priority: urgent
type: bug
tags: [backup, upload, validation, mobile]
created_by: agent
created_at: 2026-10-05T18:34:11Z
position: 120
---

## Notes
Investigate and fix the Upload & Validate Backup rejection for real Royalty Stamp backups on Samsung Browser/mobile. The current user-visible error is `Invalid file type Upload a Royalty Stamp .tar.gz backup package.` The fix must first identify the exact File object details and rejection point, then make the smallest safe change. Valid backups may have browser MIME types `application/gzip`, `application/x-gzip`, `application/octet-stream`, or empty string, and must be accepted by filename/extension plus server-side gzip/tar/manifest/version/checksum validation. Do not restore anything, do not modify production data, do not weaken Super Admin authorization, and do not change the backup creation format unless proven necessary.

Finding: the visible error is thrown in `src/pages/admin/index.tsx` before any network request when `!file.name.endsWith(".tar.gz")`. This is a strict, case-sensitive suffix check. It rejects real Royalty Stamp generated multipart/reassembled backup filenames such as the system package path ending `.tar.gz.parts`, even though the bytes are a valid gzip tar package. Because the rejection happens client-side, `file.type`, request `Content-Type`, and server archive validation are never reached. The fix keeps server-side validation as authority and accepts filenames containing `.tar.gz`, while still rejecting unsafe/unrelated uploads through gzip/tar parsing, manifest identity/version, safe paths, and checksums.

## Checklist
- [x] Inspect upload UI client-side file checks and request headers
- [x] Inspect validation API upload size/body handling and content-type assumptions
- [x] Inspect validator gzip/tar/manifest/checksum safety behavior
- [x] Identify actual rejection reason for generated Royalty Stamp backup upload
- [x] Apply smallest safe fix to accept generated `.tar.gz` backups from mobile browsers
- [ ] Test real generated backup reaches server-side validation stage
- [ ] Run project validation
- [ ] Report file name/type/size evidence, rejection cause, files changed, and test result

## Acceptance
A real Royalty Stamp backup file of at least 56.59 MB can be uploaded and reaches validation.
Unrelated file types and unsafe archives remain rejected by server-side validation.
No restore or production data modification is introduced.