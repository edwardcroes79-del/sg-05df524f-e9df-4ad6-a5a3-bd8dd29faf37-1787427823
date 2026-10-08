---
title: Super Admin plan features and entitlements repair
status: done
priority: urgent
type: bug
tags: [super-admin, entitlements, subscription-plans, security]
created_by: agent
created_at: 2026-10-08T12:03:02Z
position: 146
---

## Notes
Completed full repair of the Super Admin → Subscription Plans & Limits feature management regression and the live database-backed plan entitlement data.

Root cause:
- The Super Admin plan editor/API had regressed to a limited hardcoded feature subset.
- `subscription_plans.features` was being shown as a plain text marketing/display field, while real application access is controlled by `plan_entitlements`.
- The admin plan API filtered entitlements through a small `allowedFeatureKeys` list, so Corporate entitlement rows like `advanced_analytics`, `location_management`, `staff_location_assignment`, `location_leaderboard`, `location_specific_quick_qr`, and `max_locations` could not be fully managed through the editor.
- Live verification also found approved plan data mismatches: Starter had `max_staff = 0` instead of 1, and Corporate was missing multiple required `plan_entitlements` rows.

Existing architecture found:
- Plans are stored in `subscription_plans`.
- Display-only feature copy remains in `subscription_plans.features`.
- The source of truth for actual access is `plan_entitlements`.
- Add-ons are stored through `subscription_addons` and `business_addon_subscriptions`.
- Server-side access uses database resolver functions such as `get_business_boolean_entitlement`, `business_has_active_quick_stamp_qr`, `get_business_numeric_limit`, `get_business_effective_numeric_limit`, and enforcement functions/triggers for limits.
- RLS is enabled on `subscription_plans`, `plan_entitlements`, `subscription_addons`, and `business_addon_subscriptions`.

UI changes:
- Restored a structured database-backed feature selector in the Super Admin plan editor.
- Super Admin can now view available feature codes, select/remove boolean features, edit numeric feature limits, save, and reload assigned feature entitlements from the database.
- The existing plain text “Features” field remains only as optional display/marketing text and is explicitly labeled as not being the source of truth.
- The plan table now displays selected database-backed feature labels from `plan_entitlements`.

Database/API changes:
- Expanded the admin plan API entitlement allowlist to include the existing entitlement architecture rather than only three hardcoded features.
- Preserved base numeric entitlement rows for customer, loyalty program, and staff limits.
- Added a migration preserving the live entitlement repair:
  - `supabase/migrations/20261008120500_plan_feature_entitlement_repair.sql`
- Applied the same repair to the connected development Supabase database.

Feature codes used:
- `premium_templates`
- `reward_expiration`
- `custom_card_branding`
- `advanced_analytics`
- `quick_stamp_qr`
- `location_management`
- `multi_location_management`
- `staff_location_assignment`
- `location_manager`
- `location_analytics`
- `cross_location_analytics`
- `location_leaderboard`
- `corporate_branding`
- `location_specific_quick_qr`
- `max_loyalty_programs`
- `max_customers`
- `max_staff`
- `max_locations`

Plan-feature assignments repaired:
- Trial:
  - AWG 0
  - 50 customers
  - 1 loyalty program
  - 1 staff
  - `quick_stamp_qr` not granted by plan entitlement
- Starter:
  - AWG 35/month
  - 500 customers
  - 1 loyalty program
  - 1 staff
  - `quick_stamp_qr` not granted by plan entitlement
- Business:
  - AWG 65/month
  - 2,000 customers
  - 5 loyalty programs
  - 3 staff
  - `quick_stamp_qr` not granted by plan entitlement
- Professional:
  - AWG 95/month
  - 5,000 customers
  - 10 loyalty programs
  - 10 staff
  - `quick_stamp_qr` not granted by plan entitlement
- Corporate:
  - AWG 250/month
  - 15,000 active customers
  - 10 locations
  - 25 loyalty programs
  - 50 staff
  - `quick_stamp_qr`
  - `advanced_analytics`
  - `location_management`
  - `multi_location_management`
  - `staff_location_assignment`
  - `location_manager`
  - `location_analytics`
  - `cross_location_analytics`
  - `location_leaderboard`
  - `corporate_branding`
  - `location_specific_quick_qr`

Server-side entitlement checks repaired/verified:
- Entitlements remain database-backed through `plan_entitlements`.
- Quick QR entitlement remains resolved server-side through `business_has_active_quick_stamp_qr`.
- Numeric limits remain resolved through database limit functions and persisted numeric entitlement rows.
- The frontend selector does not grant access by itself; it writes structured rows that server-side resolvers use.

Quick QR entitlement verification:
- Trial, Starter, Business, and Professional do not receive `quick_stamp_qr` through plan entitlement.
- Lower-plan Quick QR add-on behavior remains unchanged.
- Corporate has `quick_stamp_qr = true` through plan entitlement.
- Corporate does not require the AWG 10 Quick QR add-on.

Corporate entitlement verification:
- Corporate required entitlement rows now exist and match expected boolean/numeric values.
- Verified required Corporate feature rows all returned `matches_expected = true` in development Supabase.
- Corporate `max_locations` is stored as a numeric plan entitlement with value 10.

Plan limit verification:
- Live Supabase verification returned `matches_expected = true` for all approved plan limits:
  - Trial
  - Starter
  - Business
  - Professional
  - Corporate

RLS/security verification:
- RLS is enabled on:
  - `business_addon_subscriptions`
  - `plan_entitlements`
  - `subscription_addons`
  - `subscription_plans`
- No frontend-only entitlement bypass was added.
- No duplicate entitlement system was created.
- No mock entitlements were created.
- No plan IDs were trusted from the browser for business access decisions.
- No unrelated auth, billing, Quick QR, customer, stamp, or reward logic was changed.

Regression results:
- Trial regression result: verified pricing, customer limit, loyalty program limit, staff limit, and no plan-granted Quick QR entitlement.
- Starter regression result: repaired staff limit to 1, verified pricing/limits, and preserved Quick QR add-on-only behavior.
- Business regression result: verified pricing/limits and preserved Quick QR add-on-only behavior.
- Professional regression result: verified pricing/limits and preserved Quick QR add-on-only behavior.
- Corporate test result: verified pricing/limits, Corporate feature entitlements, max locations, and included Quick QR entitlement.

Remaining mismatches:
- None found in the verified plan limit and required entitlement matrix after repair.
- Manual browser UI persistence should still be spot-checked in the Softgen preview by editing a feature, saving, refreshing, and confirming the assignment remains visible; the underlying API/UI compile and live database entitlement rows were verified.

Files changed:
- `src/pages/admin/index.tsx`
- `src/pages/api/admin/plans.ts`
- `supabase/migrations/20261008120500_plan_feature_entitlement_repair.sql`

Validation:
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Live Supabase plan limit verification passed.
- Live Supabase required entitlement verification passed.
- RLS verification passed for relevant plan/add-on tables.

## Checklist
- [x] Audit existing subscription plans, plan features, feature entitlements, add-ons, server-side checks, and RLS
- [x] Identify why the database-backed feature selector disappeared/broke
- [x] Restore database-backed Super Admin plan feature selector
- [x] Preserve display-only feature text without making it the source of truth
- [x] Expand admin plan API to persist all existing entitlement feature codes
- [x] Repair live plan entitlement rows for approved Trial, Starter, Business, Professional, and Corporate configuration
- [x] Verify Quick QR entitlement behavior for lower plans and Corporate
- [x] Verify Corporate-only entitlement rows
- [x] Verify approved pricing and plan limits
- [x] Verify RLS status on plan/add-on entitlement tables
- [x] Run project validation
- [x] Report root cause, architecture, changes, feature codes, plan assignments, server-side checks, Quick QR, Corporate, plan limits, RLS, and regression results

## Acceptance
Super Admin can manage plan feature assignments through structured database-backed entitlements instead of a free-form text field.
Actual `plan_entitlements` rows match approved plan limits and Corporate feature access.
Trial, Starter, Business, Professional, and Corporate retain approved pricing/limits and correct Quick QR/Corporate entitlement behavior.