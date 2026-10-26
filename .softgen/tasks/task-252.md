---
title: Stored backup package verification
status: done
priority: urgent
type: feature
tags: [disaster-recovery, backups, validation, restore-points]
created_by: agent
created_at: 2026-10-26T17:17:42Z
position: 252
---

## Notes
Implemented a strictly non-mutating stored backup package verification flow for the Disaster Recovery Center. The endpoint requires Super Admin authorization, accepts a backup identifier rather than arbitrary storage paths, resolves the backup job and stored archive server-side, retrieves the actual archive bytes without modifying storage or database records, runs the existing archive validation rules, compares archive evidence against backup job metadata where available, and returns structured validation statuses: VALIDATED, INVALID, INCOMPLETE, NOT_VERIFIED, BLOCKED. The UI allows validating an individual historical restore point and shows current-session validation results without persisting them. Restore writes remain blocked. No SQL, migrations, restores, project switching, deployments, or Stamp Flow / Quick Stamp modifications were performed.

Files changed:
- `src/lib/server/backupStoredPackageVerification.ts`
- `src/pages/api/admin/backups/[id]/validate-stored.ts`
- `src/pages/admin/index.tsx`
- `.softgen/tasks/task-252.md`

Validation flow:
- Resolves `backup_jobs` by trusted UUID backup ID.
- Rejects unsafe or mismatched Storage paths.
- Reconstructs single-part or manifest-listed multipart packages from `system-backups`.
- Verifies package SHA-256, size, part checksums, manifest identity, backup version, required table exports, required bucket exports, record totals, and storage file totals where evidence exists.
- Runs `validateBackupArchive()` against the actual retrieved package bytes.
- Returns structured checks, errors, warnings, confirmed counts, and a clear statement that package validation does not prove full-project recoverability.

Checks performed:
- `check_for_errors` passed with no CSS, lint, TypeScript, or server errors.

Remaining limitations:
- This validates supported package bytes only; it does not add schema recovery, Auth user recovery, destination restore writes, deployment recovery, environment/secret recovery, or external integration recovery.
- Runtime storage retrieval could not be exercised without making a live authorized request against stored backup objects, which was outside this task’s safety limits.

## Checklist
- [x] Inspect current backup job storage references, archive validation, restore-point inventory, restore preflight, restore engine, backup list endpoint, restore-upload endpoint, and admin UI
- [x] Add a Super Admin read-only endpoint that validates a stored backup package by trusted backup ID
- [x] Ensure validation retrieves actual archive bytes safely, uses size limits, and runs existing archive validation without creating restore jobs or audit logs
- [x] Compare archive manifest/checksum/size/version/count evidence against backup job metadata and return structured findings
- [x] Integrate a Disaster Recovery Center action to validate an individual historical restore point and display session-only results
- [x] Run static checks and non-destructive validation where available, then report limitations and safety confirmation

## Acceptance
A Super Admin can validate whether a stored backup package exists, is retrievable, intact, and consistent with implemented package validation rules.
The validation flow does not create or modify database rows, audit logs, restore jobs, backup jobs, storage objects, environment variables, project links, or deployments.
The UI distinguishes a validated supported package from full-project recoverability and keeps restore writes disabled.