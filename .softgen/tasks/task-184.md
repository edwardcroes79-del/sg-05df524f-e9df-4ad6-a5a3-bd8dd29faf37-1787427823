---
title: Duplicated Corporate Location Assignment Authorization
status: in_progress
priority: high
type: bug
tags: [plans, entitlements, staff, locations]
created_by: agent
created_at: 2026-10-13T18:23:55Z
position: 184
---

## Notes
Investigate and fix the error “Corporate location assignments are not enabled for this business” after duplicating the Corporate subscription plan. Scope includes tracing the exact API/backend function that throws the error, the entitlement checks and database fields involved, comparing original Corporate versus duplicated plan entitlements, checking plan duplication logic, and fixing authorization so any plan with the required configured entitlement can use location assignments regardless of plan name. Do not change subscription prices or limits, do not alter/delete business locations, staff assignments, customers, subscriptions, or existing plan assignments, do not grant location assignments to every plan, do not run destructive migrations, and do not deploy. Backend must continue verifying staff and locations belong to the same business.

## Checklist
- [ ] Trace the exact code path that throws the location-assignment error
- [ ] Identify the entitlement keys, RPCs, database fields, and API routes involved
- [ ] Compare original Corporate and duplicated plan entitlement data without changing plan values
- [ ] Inspect duplicate-plan logic for copied location entitlements and configuration
- [ ] Apply the smallest safe fix so configured entitlements authorize location assignments regardless of plan name
- [ ] Verify original Corporate still works and lower-tier plans remain restricted
- [ ] Run static checks and report root cause, modified files, migrations, and manual tests

## Acceptance
A duplicated Corporate plan with the required saved entitlements can use staff/location assignments through backend authorization. Original Corporate remains functional. Lower-tier plans without the entitlement remain blocked. No prices, limits, subscriptions, locations, assignments, customers, or destructive database changes are made.