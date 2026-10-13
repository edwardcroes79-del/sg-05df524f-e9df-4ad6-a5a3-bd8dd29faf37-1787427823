---
title: Duplicated Corporate Entitlement Access
status: done
priority: high
type: bug
tags: [plans, entitlements, dashboard, authorization]
created_by: agent
created_at: 2026-10-13T17:35:47Z
position: 182
---

## Notes
Investigate and fix why businesses assigned to a duplicated Corporate subscription plan do not receive the Corporate dashboard and feature experience. Scope includes tracing subscription plan records, plan_entitlements, dashboard UI visibility, and backend authorization. Do not change prices, limits, existing plan assignments, existing subscriptions, feature assignments, customer data, auth, RLS, destructive migrations, or deployment state. Verified root cause: duplicated plans copy plan_entitlements, but dashboard UI visibility still included hardcoded `subscription_plan === "mega_plan"` checks. `src/components/dashboard/DashboardLayout.tsx` gated Quick QR fallback, Advanced Analytics, Locations, Corporate Branding, location switcher loading, and Branding nav by the literal Corporate plan ID. `src/pages/dashboard/locations.tsx`, `src/pages/dashboard/settings.tsx`, and `src/pages/dashboard/staff.tsx` also contained hardcoded `mega_plan` gates. The safe fix uses configured `plan_entitlements` through existing `get_business_boolean_entitlement` and `get_business_effective_numeric_limit` helpers for UI visibility, while preserving and tightening backend API entitlement checks for Corporate Branding, Locations, Analytics, and staff-location assignment. Staff-location assignment now requires both `staff_location_assignment` and a positive `max_locations` entitlement on the backend. Static checks passed with no CSS, linting, type checking, or server errors. No database migration was required. Modified files: `src/components/dashboard/DashboardLayout.tsx`, `src/pages/dashboard/locations.tsx`, `src/pages/dashboard/settings.tsx`, `src/pages/dashboard/staff.tsx`, `src/pages/api/staff/locations.ts`, and this task record.

## Checklist
- [x] Inspect dashboard UI visibility and backend authorization for hardcoded plan IDs, plan names, or tier checks
- [x] Inspect duplicate-plan copy behavior and confirm entitlements are saved independently for duplicates
- [x] Identify the root cause and proposed smallest safe changes before implementation
- [x] Replace supported hardcoded Corporate access checks with configured entitlement checks without granting lower-tier plans unauthorized access
- [x] Verify existing businesses/subscriptions are not modified and duplicated plan behavior follows saved entitlements
- [x] Run available checks and report modified files, database migrations, tests, and remaining limitations

## Acceptance
A duplicated Corporate plan with copied Corporate entitlements receives the same configured Corporate dashboard features and backend-authorized access as Corporate. Editing the duplicate does not change Corporate. Existing lower-tier plans remain restricted unless their saved entitlements allow access.