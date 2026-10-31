---
title: Admin login performance investigation
status: in_progress
priority: high
type: bug
tags: [performance, investigation, admin, auth]
created_by: agent
created_at: 2026-10-31T03:06:42Z
position: 269
---

## Notes
The user reports that Admin/Superadmin login still loads slowly after Phase 1. This is a read-only investigation: no code, auth, permission, RLS, database, Stamp Flow, or Quick Stamp changes. Phase 1 improvements and the perf-phase1-baseline tag must be preserved. Report measured times, bottlenecks, and recommended fixes, then wait for approval.

## Checklist
- [ ] Trace login flow: sign-in call, session init, MFA/security check, role lookup, redirect to /admin
- [ ] Trace admin page load: auth guard, superadmin verification, initial data requests and their order
- [ ] Identify sequential requests that could run in parallel and data loaded but not shown on first view
- [ ] Measure the admin queries with read-only database statistics and query timing
- [ ] Deliver report: where the delay occurs, measured vs estimated times, bottlenecks, recommended fixes; stop for approval

## Acceptance
- The report pinpoints where the admin login delay occurs, with measured figures labeled separately from estimates.
- No code, auth, permission, RLS, database, or configuration changes are made before approval.