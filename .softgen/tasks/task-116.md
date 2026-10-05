---
title: Backup upload and validation
status: done
priority: urgent
type: feature
tags: [backup, validation, admin, security]
created_by: agent
created_at: 2026-10-05T17:16:24Z
position: 116
---

## Notes
Implemented secure backup upload and validation for Super Admin only. The validator accepts a previously downloaded Royalty Stamp backup package, validates file type, backup version, manifest, checksums, required database exports, required Storage files, and corruption/incompatibility before any future restore. Validation never restores data, modifies production data, exposes service-role credentials, or weakens security. It prevents malicious archive/path traversal attacks and handles large backup files safely with streamed upload handling and archive inspection.

Validation smoke tests used completed real backup `5a3ff5d7-d4b7-44a9-a056-fb1acb15242e`. Valid package test passed with 25 tables, 2 buckets, 1,231 records, and 103 files. Corrupted package test was rejected with `manifest.json is missing from the backup archive`. Incompatible package test was rejected with `Backup version is incompatible` and manifest checksum/size mismatch errors. No restore was performed and no production data was modified during validation. Final project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect backup package format, manifest schema, checksum conventions, and Super Admin auth/API patterns
- [x] Add server-side upload validation route with strict Super Admin authorization and no restore behavior
- [x] Validate archive file type, safe paths, manifest version, required tables, required buckets, record files, storage files, and SHA-256 checksums
- [x] Add Backup Dashboard upload UI and clear validation report using real uploaded backup data only
- [x] Test valid backup validation with a real generated package where possible
- [x] Test corrupted and incompatible backup rejection where possible
- [x] Run project validation

## Acceptance
Super Admin can upload a Royalty Stamp backup for validation without restoring data.
Corrupted, incomplete, unsafe, or incompatible backups are rejected before any restore.
Validation report clearly shows manifest, table, file, checksum, and compatibility status.