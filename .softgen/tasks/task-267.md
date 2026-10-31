---
title: Application performance slowdown investigation
status: done
priority: urgent
type: bug
tags: [performance, investigation, supabase, realtime, frontend]
created_by: agent
created_at: 2026-10-31T02:02:22Z
position: 267
---

## Notes
Investigation finished using read-only checks only. No code, schema, data, policy, or configuration changes were made. The repair is waiting for user approval.

Root cause: how the app queries the database, not the number of users. Three patterns multiply each other:
1. Realtime (live updates) change polling dominates database time.
2. Permission rules run a function per row on rewards, stamp transactions, and loyalty cards. Stamp transactions also look up the customers table per row.
3. The app refetches far too often: full dashboard reloads on every live event, a 15-second security-alert poll, and a chain of 8–10 one-after-another checks in the shared dashboard layout on every page.

Evidence (statistics accumulated since 2026-08-22):
- 17 of 60 connections in use; database about 21 MB.
- Realtime change-polling query: about 2.07M calls, about 13.7M ms total (top query by far).
- Realtime setup query: about 35.7k calls, pointing to channels being opened and closed repeatedly.
- Stamp transaction count queries average about 415 ms on about 1,130 rows.
- Businesses table (13 rows): about 2.5M full scans.
- Tables sending live updates: customer_loyalty_cards, loyalty_programs, rewards, stamp_transactions.
- Supabase API metadata refresh: about 1,830 runs at about 97 ms each (secondary).

Not verified: exact date of the slowdown, Vercel production metrics, connection pooling and Realtime connection limits.

Proposed Phase 1 (no database changes): lighter security-alert checks, grouped live-event refreshes, parallel and reused dashboard layout checks, customers page count and pagination fixes.
Proposed Phase 2 (separate approval): faster permission checks with identical access rules, plus supporting indexes.

## Checklist
- [x] Inspect shared layouts/providers (DashboardLayout, CustomerLayout, CorporateBrandingContext, I18nProvider, _app) for repeated fetches, intervals, and subscriptions
- [x] Inventory all Supabase realtime channels and setInterval/polling loops across the app
- [x] Review server logs, PM2 process CPU/RAM, and recent commits for a change correlating with the slowdown
- [x] Run read-only DB diagnostics where access allows (table sizes, index coverage on hot filter columns, slow query stats if exposed)
- [x] Check backup scheduler and other background jobs for repeated execution
- [x] Deliver report: root cause, evidence, bottlenecks, prioritized fixes, safe plan; stop for approval

## Acceptance
- The report identifies an evidence-backed root cause, or explicitly states what could not be verified.
- No code, schema, data, or configuration changes are made before approval.