---
title: Stuck backup job lock
status: done
priority: urgent
type: bug
tags: [backup, lifecycle, locking, stale-jobs]
created_by: agent
created_at: 2026-10-06T11:19:06Z
position: 126
---

## Notes
Fixed the critical backup job lock bug where the UI could report "Backup failed" but the next "Backup Now" reported "A backup job is already running. Try again after it completes." Scope was backup job-state, stale lock recovery, cleanup, cancellation, and scheduled backup locking only. Super Admin authorization, backup security, and concurrent-backup prevention were preserved.

Exact root cause:
- A serverless request can be interrupted after inserting a `running` row into `backup_jobs` but before the backup engine catch block updates that row to `failed`.
- The database running lock then remains active because `backup_jobs_single_running_idx` prevents more than one `status = running` row.
- The manual Backup Now endpoint previously returned the generic `23505` "already running" response without retrying stale recovery after the unique-lock collision.
- The generic failed-backup path did not run incomplete artifact cleanup.

Current stuck job state:
- Live inspection found no current `running` row at the start of this fix; recent backup rows were `completed`.
- Final post-test state also has `finalRunningCount: 0`.

Locking mechanism:
- Concurrent backups are still prevented by the database unique running lock (`backup_jobs_single_running_idx`) plus the run API and scheduled-backup checks.
- The fix does not remove the "already running" protection. It adds stale recovery before rejecting a new backup and retries stale recovery once when the database lock is hit.

Stale timeout:
- Default stale timeout is `60 minutes` (`3600000 ms`).
- It is configurable through `BACKUP_STALE_TIMEOUT_MINUTES`.
- The minimum accepted configured timeout is 15 minutes, preventing accidental premature abandonment.
- Stale recovery is concurrency-safe: it only abandons rows whose stale `heartbeat_at` or stale null-heartbeat `started_at` condition still matches at update time.

Files changed:
- `src/lib/server/backupLifecycle.ts`
- `src/lib/server/backupEngine.ts`
- `src/lib/server/backupScheduler.ts`
- `src/pages/api/admin/backups/run.ts`
- `.softgen/tasks/task-126.md`

Implemented:
- Failed backup catch path now transitions to `failed` and performs idempotent incomplete-artifact cleanup.
- Cancelled backups transition to `cancelled` and cleanup only runs if the running-to-cancelled update actually changed the row.
- Completed backups remain protected from lifecycle cleanup.
- Stale running jobs transition to `abandoned` after the safe heartbeat timeout and cleanup incomplete temporary files/parts.
- Manual Backup Now runs stale recovery before starting and retries stale recovery once on a running-lock collision.
- Automatic scheduled/daily backup uses the same stale recovery and running-lock path.
- Cleanup re-reads the current backup state before deleting Storage objects so a successful backup cannot be deleted by a stale cleanup/cancel read.

Actual tests performed:
- Initial stale recovery: `abandoned_count: 0`.
- Initial live running jobs: `0`.
- Successful backup completed:
  - Backup ID: `6491aac5-7ab8-4728-b1bc-ac421afa4eaa`
  - Status: `completed`
  - Size: `59,917,643` bytes
  - Part count: `2`
  - SHA-256: `846d5a17fe51adf8e04480b85da80a84e94403eb2cc6aadfdc780dabc032de96`
- Manual cancellation test:
  - Controlled running backup ID: `f9f706ba-c4aa-4ad1-b50c-93d0a7a76eff`
  - Result status: `cancelled`
  - Row status: `cancelled`
  - Cleanup completed at: `2026-10-06T11:26:52.008+00:00`
  - Files left after cleanup: `0`
  - Test row deleted after verification.
- Immediate backup after cancellation:
  - Backup ID: `1e800b48-6f4b-4c72-b244-3948f7c9b6d4`
  - Status: `completed`
  - Size: `59,917,678` bytes
  - Part count: `2`
- Stale running recovery test:
  - Controlled stale running backup ID: `762786c0-e8d3-44a0-9941-c6b15343b4ff`
  - Recovered row status: `abandoned`
  - Cleanup completed at: `2026-10-06T11:27:54.802+00:00`
  - Removed temporary object: `762786c0-e8d3-44a0-9941-c6b15343b4ff/temporary-upload.part-0001`
  - Files left after cleanup: `0`
  - Test row deleted after verification.
- Concurrent backup prevention test:
  - Controlled fresh running backup ID: `e2c204a8-4ff2-4647-840d-1b8039be9b36`
  - Manual backup creation was rejected by the unique running lock: `true`
  - Scheduled backup while running returned: `skipped_running`
  - Scheduled running backup ID matched the controlled running row.
  - Controlled row was cancelled and deleted after verification.
- Final stale recovery: `abandoned_count: 0`.
- Final running jobs: `0`.
- Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect current backup_jobs state, running lock/index behavior, heartbeat fields, and stuck job metadata
- [x] Inspect backup run, engine, scheduler, lifecycle, cancel, delete, and cleanup logic
- [x] Identify exact root cause for failed UI state leaving a running lock
- [x] Fix failed/cancelled/completed/stale transitions so a backup cannot permanently block the next one
- [x] Ensure stale recovery is concurrency-safe and does not terminate legitimate long-running backups prematurely
- [x] Ensure failed/abandoned/cancelled temporary files and archive parts are cleaned up idempotently without deleting successful backups
- [x] Verify Super Admin manual cancellation releases the running lock
- [x] Verify daily backup uses the same safe job-state and locking system
- [x] Test success, cancel/failure, immediate next backup, stale recovery, and concurrent backup prevention
- [x] Run project validation
- [x] Report root cause, current stuck job state, locking mechanism, stale timeout, files changed, tests, and final state

## Acceptance
A failed, cancelled, or abandoned backup no longer blocks the next backup.
A legitimate running backup still prevents concurrent backup creation.
Daily and manual backup flows share the same stale-job recovery and locking behavior.