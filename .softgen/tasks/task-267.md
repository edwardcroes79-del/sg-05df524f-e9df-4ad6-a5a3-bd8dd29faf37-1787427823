---
title: Application performance slowdown investigation
status: in_progress
priority: urgent
type: bug
tags: [performance, investigation, supabase, realtime, frontend]
created_by: agent
created_at: 2026-10-31T02:02:22Z
position: 267
---

## Notes
User reports a sudden, noticeable slowdown despite low active user counts. Investigate first and report the root cause, evidence, bottlenecks, prioritized fixes, and a safe optimization plan before implementing anything. Do not assume user count is the cause. Do not change schema, run migrations, modify production data, or alter features, permissions, RLS, or business logic. Do not modify Stamp Flow or Quick Stamp.

Early evidence already seen in source (to be confirmed):
- `src/pages/dashboard/index.tsx`: the realtime channel re-runs the full `fetchDashboardData` (around 10 queries, sets loading=true) on every stamp insert and every reward change for the business.
- `src/pages/dashboard/customers.tsx`: runs sequential entitlement RPCs (4 plus 1 per owned business) and downloads all active membership rows just to count them. The pagination handlers call fetch with a stale `currentPage`.
- `src/pages/customer/rewards.tsx`: the realtime handler re-queries the customer and all rewards on every reward event.

## Checklist
- [ ] Inspect shared layouts/providers (DashboardLayout, CustomerLayout, CorporateBrandingContext, I18nProvider, _app) for repeated fetches, intervals, and subscriptions
- [ ] Inventory all Supabase realtime channels and setInterval/polling loops across the app
- [ ] Review server logs, PM2 process CPU/RAM, and recent commits for a change correlating with the slowdown
- [ ] Run read-only DB diagnostics where access allows (table sizes, index coverage on hot filter columns, slow query stats if exposed)
- [ ] Check backup scheduler and other background jobs for repeated execution
- [ ] Deliver report: root cause, evidence, bottlenecks, prioritized fixes, safe plan; stop for approval

## Acceptance
- The report identifies an evidence-backed root cause, or explicitly states what could not be verified.
- No code, schema, data, or configuration changes are made before approval.