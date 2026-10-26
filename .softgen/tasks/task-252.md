---
title: Stored backup package verification
status: in_progress
priority: urgent
type: feature
tags: [disaster-recovery, backups, validation, restore-points]
created_by: agent
created_at: 2026-10-26T17:17:42Z
position: 252
---

## Notes
Implement a strictly non-mutating stored backup package verification flow for the Disaster Recovery Center. The endpoint must require Super Admin authorization, accept a backup identifier rather than arbitrary storage paths, resolve the backup job and stored archive server-side, retrieve the actual archive bytes without modifying storage or database records, run the existing archive validation rules, compare archive evidence against backup job metadata where available, and return structured validation statuses: VALIDATED, INVALID, INCOMPLETE, NOT_VERIFIED, BLOCKED. The UI must allow validating an individual historical restore point and show current-session validation results without persisting them. Restore writes remain blocked. Do not run SQL, migrations, restores, project switching, deployments, or modify Stamp Flow / Quick Stamp.

## Checklist
- [x] Inspect current backup job storage references, archive validation, restore-point inventory, restore preflight, restore engine, backup list endpoint, restore-upload endpoint, and admin UI
- [x] Add a Super Admin read-only endpoint that validates a stored backup package by trusted backup ID
- [x] Ensure validation retrieves actual archive bytes safely, uses size limits, and runs existing archive validation without creating restore jobs or audit logs
- [x] Compare archive manifest/checksum/size/version/count evidence against backup job metadata and return structured findings
- [x] Integrate a Disaster Recovery Center action to validate an individual historical restore point and display session-only results
- [ ] Run static checks and non-destructive validation where available, then report limitations and safety confirmation

## Acceptance
A Super Admin can validate whether a stored backup package exists, is retrievable, intact, and consistent with implemented package validation rules.
The validation flow does not create or modify database rows, audit logs, restore jobs, backup jobs, storage objects, environment variables, project links, or deployments.
The UI distinguishes a validated supported package from full-project recoverability and keeps restore writes disabled.