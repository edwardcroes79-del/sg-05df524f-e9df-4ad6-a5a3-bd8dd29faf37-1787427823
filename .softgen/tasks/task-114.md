---
title: Daily automatic backups
status: in_progress
priority: urgent
type: feature
tags: [backup, scheduler, retention, admin]
created_by: agent
created_at: 2026-10-05T16:57:02Z
position: 114
---

## Notes
Implement the next backup phase only: automatic daily execution for the existing backup engine. Must run server-side without browser dependency, prevent duplicate simultaneous jobs, record start/completion/status/errors, verify successful completion, keep historical backups, make retention configurable, never delete the only available backup, and clearly record failures for Super Admin. Do not implement restore. Do not modify unrelated application functionality, weaken security, or change existing production data except scheduler metadata/log records and backup retention cleanup required for this phase.

Scheduler method: Vercel Cron calls `/api/admin/backups/daily` daily at 03:00 UTC, with optional `CRON_SECRET` authorization and Vercel cron header support. Duplicate protection uses a database unique index allowing only one `running` backup job at a time, plus scheduler checks for existing running jobs and completed backups within the last 24 hours.

Retention behavior: configurable with `BACKUP_RETENTION_DAYS` defaulting to 30 and `BACKUP_RETENTION_MIN_COMPLETED` defaulting to 7. Retention removes completed backup package objects and metadata only when backups exceed the minimum retained count and are older than the retention window, and it never deletes the only completed backup.

Smoke test result: forced scheduled backup completed with job `5a3ff5d7-d4b7-44a9-a056-fb1acb15242e`, package path `5a3ff5d7-d4b7-44a9-a056-fb1acb15242e/royalty-stamp-backup-2026-10-05T17-01-33-731Z-5a3ff5d7-d4b7-44a9-a056-fb1acb15242e.tar.gz.parts`, package size `59,334,833` bytes, SHA-256 `3ecb72f3f7613034ae01eb055baba85b53d34eceef6e7e815b6dec066d2f6d90`, 2 package parts, 25 tables, 2 buckets, manifest checksums present. Second scheduler run returned `skipped_recent`, confirming 24-hour duplicate prevention. Retention preserved 2 completed backups and pruned 0.

## Checklist
- [x] Inspect existing backup engine, backup APIs, schema, package scripts, and deployment scheduler configuration
- [x] Identify the safest scheduler method compatible with the current Next.js/Vercel/Supabase environment
- [x] Add duplicate-job protection for automatic backups
- [x] Add server-side daily scheduler endpoint with secure invocation
- [x] Add configurable retention behavior that never deletes the only available backup
- [x] Verify scheduled backup execution path and failure logging
- [ ] Run project validation

## Acceptance
Automatic backups can run once every 24 hours without a browser.
Duplicate simultaneous backup jobs are prevented and failures are logged for Super Admin.
Retention is configurable and never deletes the only available backup.