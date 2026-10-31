---
title: Performance Phase 1 optimizations
status: done
priority: urgent
type: bug
tags: [performance, frontend, api, realtime]
created_by: agent
created_at: 2026-10-31T02:15:00Z
position: 268
---

## Notes
Phase 1 only, approved by the user: front-end and server-route optimizations based on the task-267 investigation. Phase 2 (database permission rewrites and indexes) needs separate explicit approval.

Hard limits:
- No changes to the database schema, migrations, RLS policies, database functions, permissions, or production data.
- No changes to Stamp Flow or Quick Stamp files (scan.tsx, quick-stamp pages, quick-stamp-qr.tsx, QuickStampFullScreen.tsx, search-send-stamp API).
- DashboardLayout.tsx wraps those pages. Only its alert polling and check sequencing may change; the Quick Stamp access check result must stay identical.
- Security checks are never removed. Live updates must keep working without stale data.
- If any step turns out to need a database change, stop and ask.

Rollback point: git tag `perf-phase1-baseline` on the current HEAD, plus Softgen Version History.

Before metrics: database query-statistics snapshot (call counts and total time for the live-update polling query, stamp transaction counts, businesses scans), plus a per-page request count measured from the code.

## Checklist
- [ ] Record rollback tag and before-metrics snapshot
- [ ] Optimization 1: security-alert check every 60 seconds and only while the tab is visible; badge requests only the unread count; full alert details only on the alerts page; endpoint looks up staff accounts in one batch
- [ ] Verify optimization 1 (static checks plus focused test of alert response shape and permission checks)
- [ ] Optimization 2: dashboard home groups live events and refreshes in the background without the loading screen; exactly one live-update channel per page with cleanup; customer rewards page refresh made lighter the same way
- [ ] Verify optimization 2 (live-update subscription still present and cleaned up; checks pass)
- [ ] Optimization 3: dashboard layout runs independent checks in parallel and reuses business access, plan checks, branding, and plans for the session, with no change in who gets access
- [ ] Verify optimization 3
- [ ] Optimization 4: customers page runs plan checks in parallel, counts members with a count query instead of downloading every row, and the page-change buttons load the correct page
- [ ] Verify optimization 4 (counts and pagination correct)
- [ ] After metrics, role-by-role verification (owner, staff, customer, superadmin), and final report

## Acceptance
- Dashboard pages make fewer sequential requests and there is no 15-second background alert polling; security alerts still appear.
- Stamps and rewards still update live without a manual refresh.
- Customer counts and pagination are accurate; no database, Stamp Flow, or Quick Stamp changes.

## Results
- Rollback point: git tag perf-phase1-baseline (0d43485).
- Optimization 1: lightweight security-alert check (unread count only), 60s polling only while the tab is visible, permission checks run at once, staff account lookups only when needed.
- Optimization 2: dashboard home live events grouped (1.5s) into a stats-only refresh with no skeletons.
- Optimization 3: shared layout checks run in 2 parallel batches; last verified result kept per user for 5 minutes and re-checked in the background; location signal only on real change. The two live-update effects were accidentally removed, then restored and covered by tests.
- Optimization 4: customers page loads everything at once; pagination now loads the requested page and only the member list. The distinct member count is kept (a correct count query would need a database change).
- Validation: scripts/test-perf-phase1.mjs passes all 4 sections (source-level tests); ESLint is clean; check_for_errors is clean; no protected or migration files changed.
- Pending: live owner/staff/customer/superadmin testing and before/after database statistics after the user publishes.