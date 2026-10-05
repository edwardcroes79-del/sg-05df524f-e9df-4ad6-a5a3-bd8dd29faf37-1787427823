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

## Checklist
- [ ] Inspect backup generation, compression, package splitting, Storage upload, download endpoint, dashboard download UI, upload endpoint, and validator behavior
- [ ] Identify why `.tar.gz.part-0001` is produced/downloaded and whether the stored backup itself is complete
- [ ] Fix the download process so multipart backup storage is assembled into a complete `.tar.gz` before the browser receives it, or otherwise provide a safe complete archive flow
- [ ] Preserve checksum/integrity validation, path traversal protection, Super Admin authorization, and backup format compatibility
- [ ] Test create backup → store backup → download backup → inspect downloaded archive → upload downloaded archive → validate backup using real backup artifacts
- [ ] Run project validation
- [ ] Report root cause, files changed, final backup size, and real downloaded backup validation result

## Acceptance
Downloaded backup filename does not end in `.part-0001` when the system is delivering a single complete backup.
The downloaded backup is a complete valid gzip-compressed TAR archive with readable manifest, database exports, and Storage files.
A real downloaded backup successfully uploads and validates without restore or production data modification.