---
title: Stuck backup job lock
status: in_progress
priority: urgent
type: bug
tags: [backup, lifecycle, locking, stale-jobs]
created_by: agent
created_at: 2026-10-06T11:19:06Z
position: 126
---

## Notes
Fix the critical backup job lock bug where the UI reports "Backup failed" but the next "Backup Now" reports "A backup job is already running. Try again after it completes." Scope is backup job-state, stale lock recovery, cleanup, cancellation, and scheduled backup locking only. Failed backups must always transition from running to failed, cancelled backups to cancelled, completed backups to completed, and crashed/timed-out/orphaned jobs must not remain running forever. Before rejecting a new backup due to a running job, the system must verify whether the job is still active and safely mark stale jobs failed or abandoned after a non-premature timeout. Preserve Super Admin authorization, prevent concurrent backups, do not delete successful backups, do not modify production application data, and do not create fake success states.

Current live-state finding: the current `backup_jobs` table no longer has a `running` row at inspection time; recent jobs are `completed`. The locking mechanism is the database unique running lock (`backup_jobs_single_running_idx`) plus the API’s `23505` handling. The bug can still occur because a serverless request can be interrupted after inserting `running` and before the catch block updates it to `failed`, and the manual run API previously returned the generic "already running" response on `23505` without retrying stale recovery. Failed jobs also did not run artifact cleanup in the generic failure path.

Fix in progress:
- Stale timeout changed to 60 minutes by default, configurable by `BACKUP_STALE_TIMEOUT_MINUTES` with a 15-minute minimum, so legitimate long-running jobs are not marked abandoned prematurely as long as their heartbeat updates.
- Stale recovery now updates only rows whose stale heartbeat/start timestamp still matches the snapshot, preventing a race from abandoning a legitimate job that heartbeated after selection.
- Failed backup catch path now transitions to `failed` and then performs idempotent incomplete-artifact cleanup.
- Manual Backup Now now retries stale recovery once after a `23505` running-lock collision before returning "already running" with current running-job metadata.
- Scheduled/daily backup lock handling now uses the same stale recovery and timeout metadata.

## Checklist
- [x] Inspect current backup_jobs state, running lock/index behavior, heartbeat fields, and stuck job metadata
- [x] Inspect backup run, engine, scheduler, lifecycle, cancel, delete, and cleanup logic
- [x] Identify exact root cause for failed UI state leaving a running lock
- [x] Fix failed/cancelled/completed/stale transitions so a backup cannot permanently block the next one
- [x] Ensure stale recovery is concurrency-safe and does not terminate legitimate long-running backups prematurely
- [x] Ensure failed/abandoned/cancelled temporary files and archive parts are cleaned up idempotently without deleting successful backups
- [ ] Verify Super Admin manual cancellation releases the running lock
- [ ] Verify daily backup uses the same safe job-state and locking system
- [ ] Test success, cancel/failure, immediate next backup, stale recovery, and concurrent backup prevention
- [ ] Run project validation
- [ ] Report root cause, current stuck job state, locking mechanism, stale timeout, files changed, tests, and final state

## Acceptance
A failed, cancelled, or abandoned backup no longer blocks the next backup.
A legitimate running backup still prevents concurrent backup creation.
Daily and manual backup flows share the same stale-job recovery and locking behavior.