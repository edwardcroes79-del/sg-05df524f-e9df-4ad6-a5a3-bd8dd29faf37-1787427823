---
title: Backup job cancel and cleanup
status: in_progress
priority: urgent
type: bug
tags: [backup, lifecycle, cancellation, cleanup]
created_by: agent
created_at: 2026-10-05T20:47:09Z
position: 123
---

## Notes
Investigate and fix backup job lifecycle issues where a backup can remain `running` indefinitely with no reliable Super Admin stop/remove path. Scope is backup system only. Add Super Admin-only cancellation for running/stuck jobs, safe cleanup of incomplete temporary files/archive parts/temporary Storage objects, cancelled status, safe deletion of cancelled/failed records, confirmation requirements in UI, stale-job heartbeat/timeout handling, and idempotent cleanup. Do not delete production database data, do not affect existing successful backups, do not weaken Super Admin authorization or Storage security, and do not modify unrelated application functionality.

Initial findings:
- Live schema only allowed backup statuses `running`, `completed`, and `failed`, so there was no way to represent `cancelled` or `abandoned`.
- `backup_jobs_single_running_idx` enforces a single running backup, so one stale `running` row blocks all future backups.
- Existing backup engine created a `running` job and only moved it to `completed` or `failed` inside the same request. If the serverless request died, timed out, or lost process state before the catch/final update, the row could remain `running`.
- Existing delete API intentionally refused `running` backups, leaving Super Admin no safe removal path for stuck jobs.

Implemented:
- Added `heartbeat_at`, `cancellation_requested_at`, `cancelled_at`, and `cleanup_completed_at` metadata columns.
- Expanded backup statuses to include `cancelled` and `abandoned`.
- Added server-side lifecycle helpers for heartbeat updates, cooperative cancellation checks, stale-job abandonment, and idempotent non-completed artifact cleanup.
- Added Super Admin cancel API at `/api/admin/backups/[id]/cancel`.
- Added cooperative cancellation/heartbeat checks in the backup engine before database export, Storage export, tar finalization, package upload, and final completion update.
- Added stale-job handling before backup creation, scheduled backup checks, and backup listing.
- Added confirmed deletion support for failed/cancelled/abandoned records, while keeping running backups protected and preserving completed-backup safeguards.
- Added restore-job guard before backup deletion.
- Added Super Admin dashboard cancel controls for running backups.

Lifecycle test evidence:
- Cancel test created controlled running backup row `93b475bc-4b84-4daa-8e95-37fe3c9419a1` with temporary Storage object `93b475bc-4b84-4daa-8e95-37fe3c9419a1/temporary-upload.part-0001`.
- Cancellation marked status `cancelled`, set `cleanup_completed_at`, and removed the temporary Storage object.
- Running cleanup a second time was idempotent and removed no additional valid files.
- Cancelled test row was safely deleted after cleanup.
- Normal backup creation still works: backup `01128063-0dac-4c32-8ad8-db3a9bed086a`, package size `59,917,261` bytes, 2 parts, SHA-256 matched metadata, validator result `valid: true`, version `2026-10-05.phase2`.
- Stale-job test created controlled stale running backup row `02f824a7-d894-4fdc-9846-2e45b13ce05c`; `markStaleBackupJobs` changed it to `abandoned`, set `cleanup_completed_at`, and the test row was deleted after verification.
- No restore was performed and no production application data was deleted.

## Checklist
- [x] Inspect backup job schema, current stuck job metadata, backup engine, scheduler, run/delete/download APIs, Storage layout, and Super Admin dashboard actions
- [x] Identify why the current backup became stuck and how running locks are currently enforced
- [x] Add heartbeat/timeout handling so stale running jobs become failed or abandoned after a safe timeout
- [x] Add Super Admin cancel API/action for running or stuck backups with safe server-side stop semantics where technically possible
- [x] Add idempotent cleanup for incomplete local temp files, archive parts, and temporary Storage objects without deleting successful backups
- [x] Allow confirmed deletion of cancelled/failed backup records while preventing deletion during restore/validation use
- [x] Test start backup, cancel backup, cleanup, cancelled delete, normal backup creation, and stale job transition
- [ ] Run project validation
- [x] Report root cause, files changed, and actual test results

## Acceptance
Super Admin can cancel a running/stuck backup and see status `cancelled`.
Cancelled/failed backup records and associated incomplete artifacts can be safely deleted with confirmation.
Successful backups remain protected and normal backup creation/download still works.