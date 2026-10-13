---
title: Corporate Enterprise Feature Standardization
status: done
priority: high
type: feature
tags: [admin, plans, entitlements, homepage]
created_by: agent
created_at: 2026-10-13T17:06:18Z
position: 179
---

## Notes
Standardized Corporate and Enterprise plan feature entitlements and new-plan defaults. Scope was Super Admin plan configuration and homepage pricing display. Added shared entitlement definitions in `src/lib/planEntitlements.ts` and wired Super Admin create/edit, admin plan API validation/defaults, and homepage feature rendering to the shared vocabulary to avoid drifting hardcoded lists. Existing Corporate was used as the reference feature set. Corporate and Enterprise were corrected in the database by upserting the missing standard feature entitlement rows only for those two plans. No authentication, RLS, billing, subscription enforcement, existing business subscriptions, or deployment state was changed. Sanitized verification confirmed Corporate and Enterprise both have the same 20 standard feature keys enabled. Static checks passed. Discrepancy reported: the authoritative Enterprise record currently stores AWG 699, 35 loyalty programs, 75,000 customers, and 75 staff, which differs from the requested intended display values of AWG 500, 25 programs, 50,000 members, and 50 staff; those limits/prices were not changed because the request prohibited silently changing database-backed limits. Corporate stores AWG 250, 25 programs, 15,000 customers, and 50 staff.

## Checklist
- [x] Inspect Super Admin plan create/edit workflow, admin plan API, homepage pricing display, and existing Corporate/Enterprise entitlements
- [x] Extract shared standard feature definitions for Corporate/Enterprise/new-plan defaults without duplicating feature lists
- [x] Ensure new plans are prepopulated with the standard feature set while preserving intentional Super Admin edits
- [x] Ensure homepage feature display uses saved entitlements from the same shared vocabulary
- [x] Correct Corporate and Enterprise configured feature entitlements to be identical without changing plan-specific limits
- [x] Run static checks, verify final Corporate/Enterprise feature parity, and report discrepancies

## Acceptance
Corporate and Enterprise display the same standard feature set. Newly created plans receive the standard feature set by default. Existing plan-specific prices, capacity limits, subscriptions, subscription enforcement, billing, auth, RLS, or existing subscriptions are not unintentionally changed.