---
title: Backup upload and validation
status: in_progress
priority: urgent
type: feature
tags: [backup, validation, admin, security]
created_by: agent
created_at: 2026-10-05T17:16:24Z
position: 116
---

## Notes
Implement secure backup upload and validation for Super Admin only. The validator must accept a previously downloaded Royalty Stamp backup package, validate file type, backup version, manifest, checksums, required database exports, required Storage files, and corruption/incompatibility before any future restore. Validation must never modify production data, expose service-role credentials, weaken security, or implement restore. It must prevent malicious archive/path traversal attacks and handle large backup files safely.

## Checklist
- [ ] Inspect backup package format, manifest schema, checksum conventions, and Super Admin auth/API patterns
- [ ] Add server-side upload validation route with strict Super Admin authorization and no restore behavior
- [ ] Validate archive file type, safe paths, manifest version, required tables, required buckets, record files, storage files, and SHA-256 checksums
- [ ] Add Backup Dashboard upload UI and clear validation report using real uploaded backup data only
- [ ] Test valid backup validation with a real generated package where possible
- [ ] Test corrupted and incompatible backup rejection where possible
- [ ] Run project validation

## Acceptance
Super Admin can upload a Royalty Stamp backup for validation without restoring data.
Corrupted, incomplete, unsafe, or incompatible backups are rejected before any restore.
Validation report clearly shows manifest, table, file, checksum, and compatibility status.