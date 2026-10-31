---
title: Admin login performance investigation
status: done
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

## Findings
- Login: 4 sequential network trips before redirect (sign-in, security-verification check, second user lookup, profile role).
- Admin page: 3 repeated checks, then fetchAdminData runs 16 steps one after another (only the 3 counts run in parallel), then one more security-verification lookup. About 21 sequential trips before the spinner clears.
- Backups, restore points, and schema recovery review load on every admin page load and after most admin actions, but are only shown on the Backups tab. The schema review builds a report from all migration files each time.
- Measured database times are small (backup jobs about 4–7 ms, plans about 1.1 ms, businesses about 0.5 ms). The exception is the total stamps count at about 415 ms, caused by the per-row permission check (Phase 2, not touched).
- End-to-end timings are not measured here; they need browser developer tools or Vercel logs.
- Proposed fixes (awaiting approval): load backup reports only on the Backups tab, load the remaining admin data in parallel, remove duplicate checks, lighter reloads after admin actions.