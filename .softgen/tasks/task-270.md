---
title: Admin login and dashboard performance fixes
status: in_progress
priority: high
type: bug
tags: [performance, admin, auth]
created_by: agent
created_at: 2026-10-31T03:14:00Z
position: 270
---

## Notes
Approved implementation of admin performance fixes 1–4 from task-269. Implement incrementally and test each. Strict limits: keep all authentication, security verification, and Superadmin role checks intact; no RLS, database function, schema, or migration changes; no Stamp Flow or Quick Stamp changes; keep the perf-phase1-baseline tag and Phase 1 improvements. No Phase 2 or database work.

Rollback point for this task: git tag perf-admin-baseline.

## Checklist
- [ ] Fix 1: load backups list, restore points, and schema recovery review only when the Backups tab opens; keep running-backup tracking working in the background
- [ ] Fix 2: load the independent admin dashboard data in parallel and show the dashboard once the admin check passes
- [ ] Fix 3: remove duplicate security-verification and user lookups on login and the admin page, keeping every check once
- [ ] Fix 4: refresh only the affected sections after admin actions, never the backup reports unless on the Backups tab
- [ ] Focused tests for each fix, ESLint, and full project check
- [ ] Report changed files, test results, and measured loading times where available

## Acceptance
- Superadmin login redirects correctly and the dashboard appears without waiting for backup reports.
- Opening the Backups tab loads all three reports, and backup/restore keeps working.
- No authentication, permission, Stamp Flow, Quick Stamp, or database changes.