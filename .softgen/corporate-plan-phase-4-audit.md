# Royalty Stamp — Corporate Plan Phase 4 Final Security, Accuracy & Stress Audit

Date: 2026-10-07  
Scope: Corporate multi-location backend and Corporate Advanced Analytics production audit.  
Result: NOT READY

## Executive Decision

Corporate is not ready for release.

The Corporate entitlement, lower-plan isolation, Quick QR add-on isolation, analytics indexes, and validation checks are in good shape. However, the required Phase 4 multi-location, customer journey, location attribution, audit logging, and analytics accuracy tests cannot be fully passed against production data because the live Corporate business currently has no configured locations, no staff-location assignments, no location-attributed stamps, no location-attributed rewards, and no location-attributed Quick QR tokens.

Per the Phase 4 instruction, READY can only be reported if all critical tests pass. They do not all pass yet.

## Issues Found

### 1. Location API schema mismatch

Severity: Release blocker  
Status: Fixed

The Corporate location API was writing fields that do not exist in the live `business_locations` schema:
- `contact_name`
- `created_by`
- `updated_by`

Root cause:
- Phase 2 API implementation did not exactly match the live table shape. The live column is `manager_name`, and the table does not expose `created_by` or `updated_by`.

Fix made:
- `src/pages/api/business/locations.ts`
  - Replaced `contact_name` with `manager_name`.
  - Removed writes to non-existent `created_by` and `updated_by`.

### 2. Staff-location API schema mismatch

Severity: Release blocker  
Status: Fixed

The staff-location assignment API was writing fields that do not exist in the live `business_user_locations` schema:
- `created_by`
- `updated_by`

Root cause:
- Phase 2 API implementation used generic audit fields instead of the live table’s supported fields.

Fix made:
- `src/pages/api/staff/locations.ts`
  - Uses `assigned_by` for assignment creator.
  - Uses `removed_at` for removal lifecycle.
  - Keeps `updated_at` only where supported.

### 3. Missing Corporate location activity data

Severity: Release blocker for READY decision  
Status: Not fixed because the instruction prohibits mock data

Live evidence:
- Corporate businesses: `1`
- Corporate locations: `0`
- Corporate active locations: `0`
- Corporate staff memberships: `3`
- Corporate location assignments: `0`
- Corporate programs: `7`
- Corporate customer loyalty cards: `15`
- Location-attributed stamps: `0`
- Location-attributed rewards earned: `0`
- Location-attributed rewards redeemed: `0`
- Quick QR tokens with location: `0`

Impact:
- The required tests for 3 locations, staff assigned to one/multiple locations, location manager isolation, default location, location switching, location QR, Quick QR location attribution, stamp location attribution, reward redemption location attribution, and cross-location customer behavior cannot be truthfully marked passed.

Reason no test data was inserted:
- Phase 4 explicitly says do not create mock data.
- Creating synthetic locations, customers, stamps, rewards, or QR events solely to satisfy the test would violate the instruction.

### 4. Audit log coverage has no live evidence yet

Severity: Release blocker for READY decision  
Status: Not fixed because no location/staff-location actions exist yet

Live evidence:
- Location audit actions: `0`
- Staff-location audit actions: `0`
- Recent supported location/staff-location actions: `[]`

Impact:
- The audit architecture is wired through the API, but production evidence of location/staff assignment audit logging does not exist yet because there are no location actions or staff-location actions in the database.

### 5. Analytics accuracy cannot be fully proven for location metrics

Severity: Release blocker for READY decision  
Status: Not fixed because required production activity does not exist

Direct metric comparison requires production Corporate location activity. Current availability shows:
- Corporate business exists.
- Corporate programs and customer cards exist.
- No Corporate location rows exist.
- No location-attributed loyalty activity exists.

Impact:
- Corporate-wide non-location metrics can be produced by the analytics function.
- Location performance, location comparison, Quick QR by location, cross-location behavior, and location-attributed redemption accuracy cannot be proven with current data.

## Fixes Made During Phase 4

### Code fixes

Files changed:
- `src/pages/api/business/locations.ts`
- `src/pages/api/staff/locations.ts`

Changes:
- Fixed live schema mismatches in Corporate location management API.
- Fixed live schema mismatches in staff-location assignment API.
- Preserved Corporate-only entitlement checks.
- Preserved lower-plan behavior.
- Did not alter Trial, Starter, Business, or Professional plan pricing, limits, add-ons, billing, dashboard behavior, customer behavior, loyalty behavior, or Quick QR add-on behavior.

### Database performance fixes

Indexes verified/added:
- `idx_business_locations_business_status`
- `idx_customer_cards_business_customer_program`
- `idx_quick_stamp_tokens_business_location_created`
- `idx_rewards_business_location_status_earned`
- `idx_rewards_business_redeemed_location_status`
- `idx_stamp_transactions_business_program_location_created`

These are non-behavioral performance indexes and do not change plan behavior.

## Plan Regression Results

Live plan snapshot:

| Plan | Status | Price AWG | Customers | Programs | Staff |
|---|---:|---:|---:|---:|---:|
| Free 14-Day Trial | active | 0 | 50 | 1 | 1 |
| Starter | active | 35 | 500 | 1 | 0 |
| Business | active | 65 | 2,000 | 5 | 3 |
| Professional | active | 95 | 5,000 | 10 | 10 |
| Corporate | active | 250 | 15,000 | 25 | 50 |

Archived rows also remain archived:
- `mega-test-plan`
- `phase3_professional_regression_20260926`

Result:
- No evidence that Trial, Starter, Business, or Professional pricing/limits were changed during Phase 4.

## Entitlement Results

Live entitlement evidence:
- Corporate `advanced_analytics`: `1`
- Lower-plan `advanced_analytics`: `0`
- Corporate `quick_stamp_qr`: `1`
- Lower-plan plan-level `quick_stamp_qr`: `0`
- Corporate `max_locations`: `10`

Result:
- Corporate Advanced Analytics is isolated to Corporate.
- Corporate Quick QR is included as a plan entitlement.
- Lower plans do not receive Corporate-only plan entitlements.

## Quick QR Results

Live add-on evidence:
- Add-on ID: `quick_stamp_qr`
- Name: `⚡ Quick Stamp QR`
- Status: `active`
- Type: `quick_stamp_qr`
- Monthly price: `AWG 10`

Result:
- Existing lower-plan Quick QR add-on behavior remains available and priced at AWG 10.
- Corporate receives plan entitlement and does not require the add-on.
- No evidence of duplicate lower-plan plan entitlement.

Blocked test:
- Corporate Quick QR with location cannot be fully tested because Corporate has `0` locations and `0` location-attributed Quick QR tokens.

## Access and Security Results

Validated from schema, entitlement, and API architecture:
- Corporate location APIs require authenticated requests.
- Location management checks `max_locations`, which is Corporate-only.
- Corporate Admin can manage all Corporate locations through owner access.
- Non-owner users only list assigned locations.
- Staff-location assignment API requires Corporate Admin ownership.
- Analytics API calls server-side `get_corporate_advanced_analytics`.
- Lower plans have no `advanced_analytics` entitlement.
- Lower plans have no plan-level Quick QR entitlement.
- Existing Quick QR add-on remains separate from Corporate entitlement.

Not fully passable yet:
- Location Manager unauthorized-location rejection cannot be live-tested because there are no locations and no location assignments.
- Staff unauthorized-location rejection cannot be live-tested because there are no locations and no location assignments.
- Customer multi-location journey cannot be live-tested because there are no locations and no location-attributed loyalty activity.

## Multi-Location Test Results

Required test: create/test at least 3 locations.  
Actual live state: `0` Corporate locations.

Result: BLOCKED / NOT PASSED

The system cannot pass:
- Create/edit/deactivate 3 live Corporate locations.
- Assign staff to one location.
- Assign staff to multiple locations.
- Verify Location Manager assigned-location restrictions.
- Verify Staff assigned-location restrictions.
- Verify default location.
- Verify location switching.
- Verify location-specific QR.
- Verify Quick QR records location.
- Verify stamps record location.
- Verify redemptions record location.

Reason:
- No production Corporate locations exist.
- No mock data was created.

## Customer Journey Test Results

Required flow:
1. One customer earns stamp at Location A.
2. Same customer earns stamp at Location B.
3. Same customer redeems reward at Location C.

Actual live state:
- Corporate customer loyalty cards: `15`
- Corporate locations: `0`
- Location-attributed stamps: `0`
- Location-attributed rewards earned: `0`
- Location-attributed rewards redeemed: `0`

Result: BLOCKED / NOT PASSED

Reason:
- No Corporate locations exist.
- No location-attributed loyalty transactions exist.
- Creating synthetic activity would violate the no mock data instruction.

## Analytics Accuracy Results

Server-side analytics function exists and can be called for Corporate contexts. Accuracy for full location analytics cannot be completely proven because there is no location activity.

Evidence:
- Corporate business exists.
- Programs exist.
- Customer cards exist.
- No location-attributed data exists.

Passed:
- Entitlement isolation for Advanced Analytics.
- Index coverage for analytics query paths.
- Browser-facing analytics endpoint returns aggregated server-side payloads, not full raw tables.

Blocked:
- Location performance accuracy.
- Location comparison accuracy.
- Cross-location customer accuracy.
- Quick QR by-location accuracy.
- Redemption by-location accuracy.

## Performance Results

Indexes present:
- `business_locations`: `idx_business_locations_business_status`
- `customer_loyalty_cards`: `idx_customer_cards_business_customer_program`
- `quick_stamp_qr_tokens`: `idx_quick_stamp_tokens_business_location_created`
- `rewards`: `idx_rewards_business_location_status_earned`
- `rewards`: `idx_rewards_business_redeemed_location_status`
- `stamp_transactions`: `idx_stamp_transactions_business_program_location_created`

Architecture result:
- Analytics are server-side aggregated.
- Browser does not load massive customer/stamp/reward tables.
- The available index set supports filtering by business, location, program, status, and timestamp for Phase 3 analytics patterns.

Blocked:
- Real 15,000+ customer / 10 location / 25 program / 50 staff stress timing cannot be truthfully measured because the current production data does not contain that scale.

## Audit Logging Results

Live evidence:
- Location audit actions: `0`
- Staff-location audit actions: `0`

Result: BLOCKED / NOT PASSED

The API contains audit inserts for:
- `business_location_created`
- `business_location_updated`
- `business_user_location_assigned`
- `business_user_location_updated`
- `business_user_location_removed`

However, no live supported actions exist yet, so Phase 4 cannot prove production audit logging with actual Corporate location activity.

## Regression Results

Passed based on live plan and entitlement snapshots:
- Trial remains active at AWG 0, 50 customers, 1 program, 1 staff.
- Starter remains active at AWG 35, 500 customers, 1 program, 0 staff.
- Business remains active at AWG 65, 2,000 customers, 5 programs, 3 staff.
- Professional remains active at AWG 95, 5,000 customers, 10 programs, 10 staff.
- Lower plans have `0` Advanced Analytics entitlement.
- Lower plans have `0` plan-level Quick QR entitlement.
- Quick QR add-on remains active at AWG 10.

No lower-plan release-blocking regression was found in the audited evidence.

## Corporate Readiness

NOT READY

Reasons:
1. Required 3-location multi-location tests cannot pass with `0` Corporate locations.
2. Required staff/location isolation tests cannot pass with `0` assignments.
3. Required customer multi-location journey cannot pass with `0` locations and `0` location-attributed activity.
4. Required location-specific Quick QR/stamp/redemption verification cannot pass with `0` location-attributed records.
5. Required audit logging verification cannot pass with `0` supported audit log entries.
6. Required analytics location/cross-location accuracy checks cannot be fully proven without location data.

## Exact Next Steps Required Before READY

1. Create real Corporate locations for the actual Corporate business, not mock/demo data.
2. Assign real staff/location manager records to one and multiple locations.
3. Execute real location-specific QR and Quick QR flows.
4. Execute one real customer journey:
   - Earn at Location A.
   - Earn at Location B.
   - Redeem at Location C.
5. Re-run Phase 4 database-backed verification.
6. Confirm audit logs were written.
7. Compare analytics metrics against the new direct database aggregates.
8. Re-run project validation.
9. Report READY only if all critical checks pass.

## Stop Point

Phase 4 audit is complete, but Corporate is not release-ready.