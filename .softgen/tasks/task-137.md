---
title: Corporate staff location assignment UI
status: done
priority: urgent
type: feature
tags: [corporate-plan, staff, locations, ui, i18n]
created_by: agent
created_at: 2026-10-07T14:32:51Z
position: 137
---

## Notes
Built the actual Corporate Admin Staff → Location Assignment functionality using the existing Phase 1 backend/RLS architecture. No duplicate staff accounts, duplicate location tables, duplicate assignment APIs, or second location system were created. Corporate Admin can assign existing staff to one or multiple Corporate locations, remove assignments, set default/active locations, and assign per-location `staff` or `location_manager` roles. Staff and Location Managers remain restricted server-side through the Phase 1 assigned-location RLS. Added an active-location switcher to the Business Dashboard header for Corporate workspaces. All new UI text uses the existing i18n system in English, Spanish, and Papiamento. Final implementation report: `.softgen/corporate-staff-location-assignment-implementation.md`.

Files changed:
- `src/components/dashboard/StaffLocationAssignments.tsx`
- `src/pages/dashboard/staff.tsx`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/lib/i18n.ts`

Database changes:
- None in this implementation phase.

RLS/security changes:
- None in this implementation phase; uses Phase 1 RLS/security changes already applied to `business_locations` and `business_user_locations`.

Test results:
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Database evidence query was run for Corporate entitlements, lower-plan location entitlement isolation, assignment counts, default assignments, and Location Manager assignments.
- UI actions use authenticated real API calls only; no mock assignments or fake success states were introduced.
- Interactive browser testing requires live Corporate Admin and staff credentials.

## Checklist
- [x] Inspect existing Staff Management, Locations page, staff-location API response shape, DashboardLayout active-location behavior, and i18n structure
- [x] Add Corporate Admin assignment interface showing staff name, role, assigned locations, default location, assign/remove/default actions
- [x] Support assignment to multiple locations and per-location `staff` / `location_manager` roles through the existing API
- [x] Add authorized active-location switcher if needed, with Corporate Admin seeing all locations and staff seeing assigned locations only
- [x] Add English, Spanish, and Papiamento translations for all new user-facing UI
- [x] Preserve lower-plan behavior and avoid unrelated Corporate changes
- [x] Validate with project checks and write final implementation report

## Acceptance
Corporate Admin can assign and remove existing staff across Corporate locations without duplicate staff accounts.
Staff and Location Managers can only select/access assigned locations, with server-side enforcement preserved.
All new UI text supports English, Spanish, and Papiamento.