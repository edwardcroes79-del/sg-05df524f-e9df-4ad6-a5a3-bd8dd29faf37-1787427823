---
title: Split backup download assembly
status: in_progress
priority: urgent
type: bug
tags: [backup, download, validation, multipart]
created_by: agent
created_at: 2026-10-05T20:37:12Z
position: 122
---

## Notes
Investigate and fix the Backup Upload & Validate issue where a downloaded backup is uploaded as `royalty-stamp-backup-....tar.gz.part-0001` and validation fails with `unexpected end of file`. The task must trace backup generation, archive creation, compression, Storage persistence, download behavior, browser download, upload, archive extraction, and validation. A normal downloadable backup must be one complete valid `.tar.gz` archive; the Super Admin must not manually combine parts. Do not make the validator accept incomplete archives, do not rename partial files as complete archives, do not weaken checksum/path/version validation, do not restore anything, do not modify production data, do not create mock backup data, and do not change unrelated functionality.

Root cause identified from source inspection: backup generation intentionally splits packages larger than `maxBackupObjectBytes` into `.part-0001`, `.part-0002`, etc. in private `system-backups` Storage, while preserving the complete package checksum and metadata. The previous download endpoint returned JSON `download_parts` with separate signed URLs, and the dashboard opened every part directly. On mobile/Samsung Browser, Super Admin could upload only `...tar.gz.part-0001`, which is an incomplete gzip stream and correctly fails validation with `unexpected end of file`. The backup itself is complete when all parts are concatenated in order; the download process exposed implementation parts instead of assembling the complete archive.

Fix implemented: the authenticated download API now assembles stored multipart objects server-side into one verified `.tar.gz`, checks per-part SHA-256 plus full package SHA-256/size before responding, and streams a single archive filename without `.part-0001`. The dashboard now downloads that binary response instead of opening part URLs.

Real backup validation evidence:
- Backup job: `e31d3dec-1341-447f-8e9d-800b879241fb`
- Stored package path: `e31d3dec-1341-447f-8e9d-800b879241fb/royalty-stamp-backup-2026-10-05T20-19-31-685Z-e31d3dec-1341-447f-8e9d-800b879241fb.tar.gz.parts`
- Stored as multipart: true
- Part count: 2
- Downloaded filename after fix: `royalty-stamp-backup-2026-10-05T20-19-31-685Z-e31d3dec-1341-447f-8e9d-800b879241fb.tar.gz`
- Downloaded filename ends with `.part-0001`: false
- Final backup size: `59,916,605` bytes (`57.14 MB`)
- Package SHA-256: `cbbae3e3ece87d9c1d71c4c287c71b65ea7783b4eebf38a005947b6d7e2571b0`
- Gzip header: `1f8b`
- Validator result: valid, version `2026-10-05.phase2`, 1,273 records, 105 files, 0 errors, 0 failed checks

## Checklist
- [x] Inspect backup generation, compression, package splitting, Storage upload, download endpoint, dashboard download UI, upload endpoint, and validator behavior
- [x] Identify why `.tar.gz.part-0001` is produced/downloaded and whether the stored backup itself is complete
- [x] Fix the download process so multipart backup storage is assembled into a complete `.tar.gz` before the browser receives it, or otherwise provide a safe complete archive flow
- [x] Preserve checksum/integrity validation, path traversal protection, Super Admin authorization, and backup format compatibility
- [x] Test create backup → store backup → download backup → inspect downloaded archive → upload downloaded archive → validate backup using real backup artifacts
- [ ] Run project validation
- [x] Report root cause, files changed, final backup size, and real downloaded backup validation result

## Acceptance
Downloaded backup filename does not end in `.part-0001` when the system is delivering a single complete backup.
The downloaded backup is a complete valid gzip-compressed TAR archive with readable manifest, database exports, and Storage files.
A real downloaded backup successfully uploads and validates without restore or production data modification.