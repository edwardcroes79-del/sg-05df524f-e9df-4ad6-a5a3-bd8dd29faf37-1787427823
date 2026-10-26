---
title: Dry run upload activation
status: done
priority: urgent
type: bug
tags: [disaster-recovery, dry-run, upload, safety]
created_by: agent
created_at: 2026-10-26T20:15:36Z
position: 262
---

## Notes
Root cause found in `src/pages/admin/index.tsx`: the Preflight Dry Run label/input were disabled when `!restoreDestinationLabel || !restoreDestinationProjectRef`, but the Destination Identification section is currently empty, so an authorized Superadmin could not populate those values and the hidden file input remained disabled. The server dry-run path in `src/lib/server/backupRestoreEngine.ts` also created `restore_jobs` and `audit_logs` rows before archive validation, so it was not read-only.

The fix enables archive-only dry-run file selection without destination fields, shows selected filename and size, enforces client-side `.tar.gz` and 1 GB checks, keeps destination-specific checks separate from archive validation, returns safe dry-run reports with zero restored records/files, and keeps Restore Upload disabled. The dry-run server path now uses a synthetic `dry-run-*` job ID and does not create restore jobs, audit logs, safety backups, table upserts, or Storage uploads.

Files changed:
- src/pages/admin/index.tsx
- src/lib/server/backupRestoreEngine.ts
- scripts/test-dry-run-upload-activation.mjs
- .softgen/tasks/task-262.md

Actual validation results:
- node scripts/test-dry-run-upload-activation.mjs: passed
- Targeted eslint/tsc command for the dry-run UI/API/engine/test files: completed successfully
- check_for_errors: passed with no CSS, linting, type checking, or server errors found

Safety confirmation:
Restore Upload remains disabled. No database, Storage, Auth, environment, project-link, deployment, Stamp Flow, Quick Stamp, SQL, migration, reset, destructive command, or restore operation occurred. Restore writes remain blocked.

## Checklist
- [x] Inspect admin UI, restore-upload API, preflight engine, restore engine, archive validation utilities, and recent DR task reports
- [x] Identify the exact current-code cause of the inactive Dry Run upload button
- [x] Implement the smallest safe fix so Upload for Dry Run opens the file picker and supports archive-only validation
- [x] Preserve the Restore Writes Disabled panel and all server-side restore-write safeguards
- [x] Add focused tests for enabled Dry Run upload, file-picker wiring, file selection UI state, archive-only validation without destination authorization, invalid/oversized errors, server authorization, no restore-write invocation, and disabled restore upload
- [x] Run focused tests and static checks, then report actual results and safety confirmation

## Acceptance
An authorized Superadmin can click Upload for Dry Run, select a supported archive, see filename and size, run read-only archive validation, and view PASS/WARNING/BLOCKED output.
Restore Upload remains disabled and does not become enabled through this task.
No database, Storage, Auth, environment, project-link, deployment, Stamp Flow, Quick Stamp, SQL, migration, reset, destructive, or restore operation occurs.