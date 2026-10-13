---
title: Duplicated Corporate Location UI Parity
status: done
priority: high
type: bug
tags: [plans, entitlements, dashboard, locations]
created_by: agent
created_at: 2026-10-13T18:18:07Z
position: 183
---

## Notes
Investigate why a duplicated Corporate plan does not reproduce the full Corporate dashboard experience, especially the active-location selector and Locations page functionality. Scope includes dashboard menus, feature access, location-management UI, active-location selector loading/switching, backend location authorization, and plan duplication entitlement copying. Do not deploy, do not perform destructive database changes, do not alter production subscriptions, and do not copy business-specific data like locations, active location, staff assignments, customers, or subscriptions into plan configuration. Preserve location isolation so a business can only see/select its own authorized locations. Root cause found: the previous hardcoded `mega_plan` gates were removed, but `DashboardLayout` still loaded active-location selector rows directly from `business_locations` instead of the secured `/api/business/locations` authorization path. That made duplicated-plan location UI dependent on client-side RLS visibility rather than the same backend entitlement check used by the Locations page. The Locations page also updated localStorage without broadcasting the active-location change to the header selector. Fix: `DashboardLayout` now asks `/api/business/locations` with the authenticated session, uses returned `maxLocations` for the location-management menu gate, and only renders authorized returned locations. The Locations page now dispatches the existing `royalty-active-location-change` event when selecting/deactivating an active location. Plan duplication already copies structured entitlements through the Super Admin plan form/API; no business-specific locations, assignments, customers, subscriptions, or active-location values are copied into plan records. Existing businesses using duplicated plans do not need subscription changes; if a duplicate was created before Corporate entitlements were enabled, the Super Admin should verify that duplicate’s saved `max_locations`, `location_management`, `staff_location_assignment`, and related feature entitlements. Static checks passed with no CSS, linting, type checking, or server errors. No database migration was required. Modified files: `src/components/dashboard/DashboardLayout.tsx`, `src/pages/dashboard/locations.tsx`, and this task record.

## Checklist
- [x] Trace original Corporate dashboard menu, feature access, location-management functionality, and active-location selector behavior
- [x] Identify any remaining hardcoded Corporate plan-name, plan-ID, tier, or dashboard checks blocking duplicated plans
- [x] Inspect duplicate-plan copying of feature flags, entitlements, location limits, and relevant reusable configuration
- [x] Replace unsafe hardcoded gates with configured entitlement/limit checks while preserving backend authorization and lower-tier restrictions
- [x] Verify active-location selector loads only authorized business locations and switches safely
- [x] Run static checks and report root cause, modified files, migrations, manual tests, and any entitlement-refresh limitation

## Acceptance
A business assigned to a duplicated Corporate plan with copied Corporate entitlements sees the same authorized Corporate dashboard features as the original Corporate plan, including the active-location selector and Locations page. Editing the duplicate does not modify Corporate. Lower-tier plans remain restricted unless their saved entitlements allow access.