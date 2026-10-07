---
title: Corporate analytics backend
status: done
priority: urgent
type: feature
tags: [corporate-plan, analytics, backend, security]
created_by: agent
created_at: 2026-10-07T13:55:56Z
position: 132
---

## Notes
Phase 3 backend implementation is complete for Corporate-only Advanced Analytics. The implementation uses production Supabase data and server-side aggregation. No mock data was added. No pricing, limits, add-ons, billing logic, Quick QR lower-plan behavior, or existing dashboard behavior for Trial, Starter, Business, or Professional was changed.

Files changed:
- `src/pages/api/business/analytics.ts`
- Supabase function/index changes through SQL:
  - `public.get_corporate_advanced_analytics(...)`
  - `idx_stamp_transactions_business_program_location_created`
  - `idx_rewards_business_location_status_earned`
  - `idx_quick_stamp_tokens_business_location_created`
  - `idx_customer_cards_business_customer_program`
  - `idx_business_locations_business_status`

Queries implemented:
- Server-side date-window aggregation for overview metrics, customer activity, locations, programs, Quick QR, cross-location behavior, trends, and insights.
- API query parameters: `range`, `start`, `end`, `location_id`.
- No entire customer/stamp/reward tables are loaded into the browser.

Entitlement checks:
- API requires authenticated user session.
- API calls server-side analytics RPC using the user ID and business context.
- Analytics RPC enforces `advanced_analytics` entitlement.
- Final entitlement verification returned:
  - `corporate_advanced_analytics_entitlement: 1`
  - `lower_plan_advanced_analytics_entitlements: 0`
  - `corporate_quick_qr_plan_entitlement: 1`

Security results:
- Corporate analytics access is enforced server-side.
- Lower plans are not entitled to Corporate Advanced Analytics.
- Location filtering uses Phase 2 location-access architecture.
- Business isolation remains enforced through server-side business/user checks and RLS-aware architecture.
- Super Admin authorization and existing lower-plan permissions were not weakened.

Accuracy results:
- KPIs are calculated from real tables: customers, customer loyalty cards, stamp transactions, rewards, QR/Quick QR activity, programs, and locations.
- No revenue, profit, ROI, or CLV metrics were created because those data sources are not available.
- Empty states are shown when no activity exists.

Performance results:
- Aggregation happens server-side.
- Browser receives summary objects, not raw historical tables.
- Added focused indexes for date/location/program/status filters used by Corporate analytics.
- Designed for 15,000+ customers, 10 locations, 25 programs, and 50 staff.

Regression results:
- Trial, Starter, Business, and Professional retain existing plan behavior.
- Lower-plan advanced analytics entitlement count verified as `0`.
- Existing Quick QR add-on behavior for lower plans was not modified.
- Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Add Corporate-only server-side analytics access enforcement
- [x] Aggregate overview, customer, location, program, Quick QR, cross-location, and trend metrics from real Supabase data
- [x] Add focused indexes needed for analytics performance
- [x] Preserve existing lower-plan analytics/dashboard behavior
- [x] Verify no lower-plan entitlement receives Corporate Advanced Analytics
- [x] Validate project with lint, type checking, CSS, and server checks

## Acceptance
Only Corporate businesses can access Advanced Analytics.
Analytics metrics are calculated server-side from real production tables.
Location Managers and Staff only receive allowed location-scoped analytics.