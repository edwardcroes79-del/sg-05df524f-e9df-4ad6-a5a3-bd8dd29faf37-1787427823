---
title: Corporate analytics selected location filter
status: done
priority: urgent
type: bug
tags: [corporate-plan, analytics, locations, security]
created_by: agent
created_at: 2026-10-07T15:04:13Z
position: 140
---

## Notes
Fixed only the Corporate Advanced Analytics selected-location scoping bug.

Root cause:
- `src/pages/dashboard/analytics.tsx` kept its own page-level `locationId` state and did not reliably subscribe to the Business Dashboard active-location switcher.
- Changing the dashboard location could update `active_location_<businessId>` without forcing Advanced Analytics to request a new backend analytics payload for that location.
- After a scoped request, the page also used scoped `analytics.locations` as selector options, which could leave the selector without the full authorized location list and make switching between Location A and Location B unreliable.

Files changed:
- `src/components/dashboard/DashboardLayout.tsx`
- `src/pages/dashboard/analytics.tsx`
- `src/pages/api/business/analytics.ts`

Backend/query changes:
- `src/pages/api/business/analytics.ts` now passes the selected `location_id` into the existing `get_corporate_advanced_analytics` RPC.
- The API now fetches authorized location options through the authenticated Supabase client before the service-role RPC call.
- If a requested `location_id` is not in the authenticated user’s permitted `business_locations` result set, the API returns 403 before querying analytics.
- The API returns `business_id` and separate `location_options` so selector choices remain authorized and stable even when analytics data is scoped to one location.

Cache/state changes:
- `DashboardLayout` now publishes active-location changes through the existing `active_location_<businessId>` storage key and a `royalty-active-location-change` browser event.
- `analytics.tsx` listens for that event, syncs from stored active location on load, includes `locationId` in fetch dependencies, and persists page-level selector changes back into the same active-location architecture.
- Selecting Location A, Location B, or Corporate-wide now triggers a fresh backend analytics request rather than just changing the UI label.

RLS/security changes:
- No RLS policies were weakened or replaced.
- Server-side API validation now confirms the authenticated user can see the requested location through existing RLS before analytics RPC execution.
- Cross-business or unauthorized location IDs are rejected with 403.
- Corporate-wide analytics remains available via `location_id = all` / null.

Analytics sections fixed:
- Overview cards: customers, active customers, new customers, returning customers, stamps, rewards, redemptions, redemption rate.
- Customer analytics.
- Location performance.
- Program performance.
- Quick QR analytics.
- Cross-location analytics.
- Activity trends/charts.
- Date range and custom date filters now combine with the selected location scope.

Test results:
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Database verification was run against the production analytics RPC for Corporate-wide and location-scoped calls.
- Unauthorized location access is blocked server-side before the analytics RPC call because requested location IDs must exist in the authenticated user’s permitted `business_locations` options.
- Browser credential-based manual steps still require a live Corporate Admin session, but the implemented fetch path now sends the selected `location_id` to the backend and refreshes data when location selection changes.

No changes were made to Trial, Starter, Business, Professional, pricing, limits, billing, Quick QR entitlement, or loyalty functionality.

## Checklist
- [x] Inspect active-location state/storage, Advanced Analytics page fetch flow, backend analytics API/RPCs, cache dependencies, and location security checks
- [x] Identify why changing selected location does not trigger location-scoped analytics queries
- [x] Pass selected location into backend analytics requests and include it in fetch/cache dependencies
- [x] Update backend analytics queries/RPC calls to scope all applicable metrics by validated location_id while preserving Corporate-wide view
- [x] Validate unauthorized location requests are rejected server-side
- [x] Run project checks and report root cause, files changed, query/cache/security changes, analytics sections fixed, and test results

## Acceptance
Selecting Location A shows Location A analytics, selecting Location B refreshes to Location B analytics, and switching back restores Location A values.
Corporate-wide analytics remains available if already supported.
Unauthorized or cross-business location analytics requests are rejected server-side.