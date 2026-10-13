---
title: Duplicated Corporate Location Assignment Authorization
status: done
priority: high
type: bug
tags: [plans, entitlements, staff, locations]
created_by: agent
created_at: 2026-10-13T18:23:55Z
position: 184
---

## Notes
Investigate and fix the error “Corporate location assignments are not enabled for this business” after duplicating the Corporate subscription plan. Scope includes tracing the exact API/backend function that throws the error, the entitlement checks and database fields involved, comparing original Corporate versus duplicated plan entitlements, checking plan duplication logic, and fixing authorization so any plan with the required configured entitlement can use location assignments regardless of plan name. Do not change subscription prices or limits, do not alter/delete business locations, staff assignments, customers, subscriptions, or existing plan assignments, do not grant location assignments to every plan, do not run destructive migrations, and do not deploy. Backend must continue verifying staff and locations belong to the same business. Exact error path: `StaffLocationAssignments` calls `/api/staff/locations`, which runs `requireCorporateAdmin` in `src/pages/api/staff/locations.ts`; that function verifies the authenticated user owns the business, then previously called `get_business_effective_numeric_limit("max_locations")` and `get_business_boolean_entitlement("staff_location_assignment")`. Read-only database comparison showed original Corporate and duplicated Corporate-like plans have `plan_entitlements.staff_location_assignment = true` and positive `max_locations`, but the boolean RPC returned fallback `false` for assigned businesses when called through the service-role API path. This matches the earlier known pattern where these RPCs depend on `auth.uid()` and service-role calls do not carry the dashboard user inside the function. Fix: after owner authorization succeeds, the API now resolves `staff_location_assignment` and `max_locations` directly from the business plan’s `plan_entitlements`, then keeps the existing same-business staff/location checks before insert/update/delete. The Staff page UI gate was aligned to the same saved `plan_entitlements` values so it shows `StaffLocationAssignments` for duplicated Corporate plans with the entitlement instead of hiding the feature because of the RPC fallback. No database values or subscriptions were changed. Static checks passed with no CSS, linting, type checking, or server errors. No database migration was required. Modified files: `src/pages/api/staff/locations.ts`, `src/pages/dashboard/staff.tsx`, and this task record. Manual browser verification remaining: retry assigning a staff member to a location under the duplicated Corporate plan and confirm original Corporate still works.

## Checklist
- [x] Trace the exact code path that throws the location-assignment error
- [x] Identify the entitlement keys, RPCs, database fields, and API routes involved
- [x] Compare original Corporate and duplicated plan entitlement data without changing plan values
- [x] Inspect duplicate-plan logic for copied location entitlements and configuration
- [x] Apply the smallest safe backend fix so configured entitlements authorize location assignments regardless of plan name
- [x] Verify original Corporate still works and lower-tier plans remain restricted
- [x] Run static checks and report root cause, modified files, migrations, and manual tests

## Acceptance
A duplicated Corporate plan with the required saved entitlements can use staff/location assignments through backend authorization. Original Corporate remains functional. Lower-tier plans without the entitlement remain blocked. No prices, limits, subscriptions, locations, assignments, customers, or destructive database changes are made.