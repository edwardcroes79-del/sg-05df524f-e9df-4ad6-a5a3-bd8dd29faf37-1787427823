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

Need to investigate the current stuck backup and determine why it became stuck before applying fixes.

## Checklist
- [ ] Inspect backup job schema, current stuck job metadata, backup engine, scheduler, run/delete/download APIs, Storage layout, and Super Admin dashboard actions
- [ ] Identify why the current backup became stuck and how running locks are currently enforced
- [ ] Add heartbeat/timeout handling so stale running jobs become failed or abandoned after a safe timeout
- [ ] Add Super Admin cancel API/action for running or stuck backups with safe server-side stop semantics where technically possible
- [ ] Add idempotent cleanup for incomplete local temp files, archive parts, and temporary Storage objects without deleting successful backups
- [ ] Allow confirmed deletion of cancelled/failed backup records while preventing deletion during restore/validation use
- [ ] Test start backup, cancel backup, cleanup, cancelled delete, normal backup creation, and stale job transition
- [ ] Run project validation
- [ ] Report root cause, files changed, and actual test results

## Acceptance
Super Admin can cancel a running/stuck backup and see status `cancelled`.
Cancelled/failed backup records and associated incomplete artifacts can be safely deleted with confirmation.
Successful backups remain protected and normal backup creation/download still works.