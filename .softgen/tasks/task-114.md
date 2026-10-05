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

## Checklist
- [x] Inspect existing backup engine, backup APIs, schema, package scripts, and deployment scheduler configuration
- [x] Identify the safest scheduler method compatible with the current Next.js/Vercel/Supabase environment
- [x] Add duplicate-job protection for automatic backups
- [x] Add server-side daily scheduler endpoint with secure invocation
- [x] Add configurable retention behavior that never deletes the only available backup
- [ ] Verify scheduled backup execution path and failure logging
- [ ] Run project validation

## Acceptance
Automatic backups can run once every 24 hours without a browser.
Duplicate simultaneous backup jobs are prevented and failures are logged for Super Admin.
Retention is configurable and never deletes the only available backup.