---
title: Corporate locations management UI
status: done
priority: urgent
type: bug
tags: [corporate-plan, locations, dashboard, ui]
created_by: agent
created_at: 2026-10-07T14:12:15Z
position: 135
---

## Notes
Fixed only the missing Corporate Admin location management UI. Existing backend functionality found: `business_locations`, `business_user_locations`, `loyalty_program_locations`, nullable location attribution, RLS policies, and `/api/business/locations` for list/create/edit/deactivate already existed from Phase 2. The missing functionality was the visible Business Dashboard UI/menu. During inspection, the existing create endpoint also needed a real `business_locations.slug` write to satisfy the live schema. No duplicate tables, APIs, or location systems were created.

Files changed:
- `src/components/dashboard/DashboardLayout.tsx`
- `src/pages/dashboard/locations.tsx`
- `src/pages/api/business/locations.ts`

Database changes:
- None. The schema already existed.

RLS/security changes:
- None. The UI and API use the existing Corporate location architecture and server-side entitlement/business checks.
- Locations management is visible only for Corporate business owners.
- The API rejects lower-plan businesses through `max_locations` entitlement checks.
- The API rejects non-owner staff/location managers for create/edit/deactivate actions.

Dashboard placement:
- Added `Locations` to the Business Dashboard sidebar for Corporate Admin owners only, linking to `/dashboard/locations`.

Validation results:
- Project checks passed: no CSS, linting, TypeScript, or server errors.
- Plan entitlement query confirmed `mega_plan` has `max_locations = 10`, `advanced_analytics = 1`, and `quick_stamp_qr = 1`.
- Trial, Starter, Business, and Professional have `max_locations = 0`, `advanced_analytics = 0`, and `quick_stamp_qr = 0` at the plan-entitlement level.
- Interactive login/click testing as a real Corporate Admin requires a browser session and production credentials; the implemented UI uses only authenticated API calls and real Supabase data.

## Checklist
- [x] Inspect existing `business_locations` backend/table/API and confirm create/edit/deactivate support
- [x] Inspect dashboard navigation/layout to determine where Corporate location management should appear
- [x] Add Corporate-only Locations menu/section without exposing it to lower plans
- [x] Add Corporate Admin UI for list, create, edit, deactivate, status, and active-location selection using real API data
- [x] Preserve existing lower-plan behavior and avoid unrelated Corporate changes
- [x] Validate with project checks and report files changed, backend found, security, database changes, and test results

## Acceptance
Corporate Admin sees a clear Locations section in the Business Dashboard and can manage real locations.
Lower-plan businesses do not see or access the Locations management UI.
No duplicate backend/database location system is created.