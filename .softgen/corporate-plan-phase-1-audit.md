# Royalty Stamp — Corporate Plan Phase 1 Audit

Date: 2026-10-07  
Scope: Architecture and database audit only. No code, schema, production data, pricing, add-on, permission, RLS, billing, or plan behavior changes were made.

## Executive Summary

Corporate capability should be added through the existing plan and entitlement architecture, not by rewriting billing or duplicating customer/program/stamp systems.

Important finding: the database already contains an active Corporate plan row with ID `mega_plan`, name `Corporate`, price `AWG 250.00`, limits of `15,000` customers, `25` loyalty programs, and `50` staff. The existing Corporate row does not yet expose the required Corporate-specific entitlements for `max_locations`, `advanced_analytics`, or included `quick_stamp_qr`.

Recommended Phase 2 direction: treat `mega_plan` as the existing Corporate plan unless the product owner explicitly chooses to rename/migrate the ID later. Do not create a duplicate Corporate plan without a migration decision, because businesses may already reference `mega_plan`.

## Evidence Reviewed

### Opened application files

- `src/pages/dashboard/quick-stamp-qr.tsx`
- `src/pages/quick-stamp/[token].tsx`
- `src/pages/dashboard/qr.tsx`
- `src/pages/dashboard/scan.tsx`
- `src/pages/dashboard/billing.tsx`
- `src/pages/dashboard/staff.tsx`
- `src/pages/dashboard/index.tsx`
- `src/pages/api/business/addons.ts`
- `src/pages/api/admin/plans.ts`
- `src/pages/api/staff/create.ts`
- `.softgen/architecture.md`

### Database evidence queried

Current active and archived subscription plans:

- `trial`: Free 14-Day Trial, AWG 0, 50 customers, 1 program, 1 staff.
- `starter`: Starter, AWG 35, 500 customers, 1 program, 0 staff.
- `business`: Business, AWG 65, 2,000 customers, 5 programs, 3 staff.
- `pro`: Professional, AWG 95, 5,000 customers, 10 programs, 10 staff.
- `mega_plan`: Corporate, AWG 250, 15,000 customers, 25 programs, 50 staff, active, display order 5.
- `mega-test-plan`: archived.
- `phase3_professional_regression_20260926`: archived.

Current plan entitlements:

- Existing entitlement keys are `premium_templates`, `reward_expiration`, `custom_card_branding`, `max_loyalty_programs`, `max_customers`, and `max_staff`.
- `mega_plan` currently has:
  - `max_customers = 15000`
  - `max_loyalty_programs = 25`
  - `max_staff = 50`
  - `premium_templates = true`
  - `reward_expiration = true`
  - `custom_card_branding = true`
- Missing Corporate entitlement keys:
  - `max_locations`
  - `advanced_analytics`
  - `quick_stamp_qr`

Current add-ons:

- `quick_stamp_qr`: active, AWG 10/month, metadata entitlement key `quick_stamp_qr`.
- `customer_capacity_100`: active, AWG 5/month.
- `customer_capacity_250`: active, AWG 10/month.
- `customer_capacity_500`: active, AWG 20/month.
- `customer_capacity_1000`: active, AWG 30/month.

## Existing Relevant Architecture

### Businesses

Businesses are the tenant root. Existing code consistently resolves a business through one of:

- `businesses.owner_id`
- active `business_users` membership
- Supabase RPC helpers such as dashboard access functions

Corporate should remain one `businesses` row. Locations should be children of that business, not separate businesses.

### Business users and staff

Existing staff membership is stored in `business_users` with:

- `business_id`
- `user_id`
- `role`
- `status`
- `created_at`

Current staff creation is owner-only in `src/pages/api/staff/create.ts`. It enforces:

- authenticated caller
- owner must own the business
- contract must not be expired
- plan staff limit via `subscription_plans.max_staff` and `plan_entitlements.max_staff`
- active staff count from `business_users`

Current role model is too coarse for Corporate because it supports owner/staff but not location-scoped managers or multi-location assignments.

### Customers

Customers remain global customer profiles and are linked to businesses/programs through loyalty cards. The current dashboard and scanner use business-scoped customer/card data. Corporate should keep this model:

- one customer profile
- one business tenant
- cards/program activity scoped to the corporate business
- location as an activity dimension, not a customer database split

### Loyalty programs

Existing loyalty programs are business-scoped. Current UI and QR generation fetch active programs by `business_id`.

Corporate needs to add optional program-location targeting without breaking business-wide programs. The safest architecture is:

- keep `loyalty_programs.business_id`
- add optional relationship table between programs and locations
- treat no location mapping as corporate-wide/shared program

### Stamp issuance

Manual stamp issuance currently occurs in `src/pages/dashboard/scan.tsx` through the `issue_stamp_tx` RPC with:

- `p_customer_id`
- `p_business_id`
- `p_loyalty_program_id`

The page also handles reward redemption through redemption RPCs.

Corporate location support must not rely on frontend-only location fields. The issuing RPC path must accept and validate location context server-side.

### Quick QR Stamp

Existing Quick QR flow:

- Display page: `src/pages/dashboard/quick-stamp-qr.tsx`
  - loads dashboard business access through `get_business_dashboard_access_status`
  - fetches active `loyalty_programs`
  - calls `generate_quick_stamp_qr_token`
- Customer page: `src/pages/quick-stamp/[token].tsx`
  - requires Supabase customer session
  - calls `get_quick_stamp_qr_context`
  - calls `quick_stamp_qr_issue_stamp`
  - sends receipt for successful transaction

Current add-on and entitlement architecture includes an active `quick_stamp_qr` add-on with `metadata.entitlement_key = quick_stamp_qr`.

Corporate requirement: Corporate must receive Quick QR through a plan entitlement and must not require a `business_addon_subscriptions` row.

### Static/program QR codes

Existing QR management in `src/pages/dashboard/qr.tsx`:

- resolves owner/staff business
- fetches active programs by business
- stores generated QR rows in `qr_codes`
- code format uses `JOIN:${programId}`
- rendered join URL points to `/join/${qr.loyalty_program_id}`

Location QR should extend this architecture without changing current behavior:

- current program QR remains valid and business/program scoped
- location-specific QR rows should carry location metadata or a new nullable `location_id`
- QR type should distinguish `join_program` vs location-aware variants

### Billing and add-ons

Existing billing in `src/pages/dashboard/billing.tsx`:

- loads current business plan
- loads effective customer limit via `get_business_effective_numeric_limit`
- fetches `/api/business/addons`
- displays active add-ons and available add-ons
- allows plan change through `/api/business/plan-change`
- allows add-on purchase/cancel through `/api/business/addons`

Existing add-on API in `src/pages/api/business/addons.ts`:

- owner-only
- contract-aware
- includes active `customer_capacity` and `quick_stamp_qr` add-ons
- prevents duplicate add-on subscriptions
- calculates subscription totals from base plan + approved active add-ons
- inserts pending add-on subscriptions for Super Admin review
- uses add-on metadata/entitlement keys

Corporate included Quick QR must be handled without changing lower-plan behavior. The add-on can remain available to lower plans. Corporate should be excluded from needing/purchasing it by entitlement checks, not by changing the add-on itself.

### Super Admin plans

Existing Super Admin plan API in `src/pages/api/admin/plans.ts`:

- lists subscription plans and entitlements
- supports create/update plan
- allowed entitlement keys are currently:
  - `premium_templates`
  - `reward_expiration`
  - `custom_card_branding`
  - `max_loyalty_programs`
  - `max_customers`
  - `max_staff`

Phase 2 will need to extend allowed Corporate entitlement keys without changing existing plan values.

### Dashboard analytics

Existing `src/pages/dashboard/index.tsx` shows basic counts:

- unique customers from `customer_loyalty_cards`
- active cards count
- stamps issued count
- rewards earned count
- rewards redeemed count
- recent stamp activity

This is basic analytics, not Corporate advanced analytics. It loads counts directly from tables and limits recent activity to 5 rows.

Corporate analytics should be separate and entitlement-gated so existing dashboards are unchanged.

## Existing Plan and Entitlement Architecture

### Current strengths

- Plan limits are partly normalized through `plan_entitlements`.
- Existing APIs already enforce some limits server-side, e.g. staff creation.
- Add-ons can contribute entitlements such as `max_customers` and `quick_stamp_qr`.
- Super Admin can manage plans and entitlements centrally.

### Current gaps for Corporate

- `quick_stamp_qr` is present as add-on metadata but not present as a plan entitlement for `mega_plan`.
- No `max_locations` entitlement exists.
- No `advanced_analytics` entitlement exists.
- Super Admin plan API only allows the current six entitlement keys.
- Billing UI likely still shows Quick QR as an available add-on for all plans because `/api/business/addons` returns active `quick_stamp_qr` add-on rows regardless of plan entitlement.
- Location limits and location-scoped roles do not exist.

## Existing Quick QR Architecture

### Current behavior

Quick QR is implemented through Supabase RPCs and the Quick QR add-on model:

- `generate_quick_stamp_qr_token`
- `get_quick_stamp_qr_context`
- `quick_stamp_qr_issue_stamp`

The UI display page does not hardcode a fake QR. It generates a token using the backend and renders a real route `/quick-stamp/[token]`.

The customer flow uses the token to issue a real stamp transaction and sends a receipt for successful transactions.

### Required Corporate adaptation

Corporate should receive Quick QR through plan entitlement:

- Add plan entitlement:
  - `plan_id = mega_plan`
  - `key = quick_stamp_qr`
  - `value_type = boolean`
  - `boolean_value = true`
- Ensure `get_business_boolean_entitlement` or equivalent entitlement resolver checks both:
  - plan entitlements
  - approved active add-on subscriptions
- Corporate should not need an add-on row.
- Corporate should not be charged AWG 10 for Quick QR.
- Lower plans should keep current add-on purchase behavior.
- Duplicate entitlements should be resolved as boolean OR:
  - plan entitlement true OR active add-on true = enabled once
  - no duplicate subscription billing
  - no duplicate UI feature

## Proposed Corporate Location Architecture

### New table: `business_locations`

Purpose: stores location records under one corporate business.

Recommended fields:

- `id uuid primary key`
- `business_id uuid not null references businesses(id)`
- `name text not null`
- `slug text not null`
- `address text`
- `phone text`
- `email text`
- `manager_name text`
- `metadata jsonb default '{}'`
- `status text not null check in ('active', 'temporarily_closed', 'inactive')`
- `created_by uuid references auth.users(id)`
- `updated_by uuid references auth.users(id)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `deactivated_at timestamptz null`

Rules:

- Unique slug per business.
- Never delete locations with historical activity.
- Inactive locations remain queryable for history but unavailable for new activity.
- Temporarily closed locations remain visible but blocked for new stamp issuance unless Corporate Admin allows exceptions.

### New table: `business_user_locations`

Purpose: assigns staff/managers to one or more locations.

Recommended fields:

- `id uuid primary key`
- `business_user_id uuid not null references business_users(id)`
- `business_id uuid not null references businesses(id)`
- `location_id uuid not null references business_locations(id)`
- `role text not null check in ('location_manager', 'staff')`
- `is_default boolean default false`
- `status text not null check in ('active', 'inactive')`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Rules:

- One active default location per business user.
- Corporate Admin can assign any location under the business.
- Location Manager can manage assigned locations only.
- Staff can issue stamps/redeem rewards only for assigned active locations.
- Owner/Corporate Admin can access all locations.

### Business user role model

Recommended roles:

- `owner` remains existing owner/corporate admin path.
- `staff` remains existing staff role.
- Add or standardize business role values:
  - `corporate_admin`
  - `location_manager`
  - `staff`

Important: If changing role values risks existing code, keep `business_users.role = staff` for current staff and add a separate permission/location table first. Do not break existing role checks.

## Staff-Location Relationship

### Corporate Admin

Can:

- create/edit/deactivate locations
- view all locations
- assign staff to one or more locations
- set default location
- view corporate-wide analytics
- view all location activity
- issue administrative corrections only through audited server-side functions

### Location Manager

Can:

- view assigned locations
- manage assigned location staff if allowed
- view assigned location activity
- issue/redeem stamps only for assigned active locations
- view location analytics for assigned locations

### Staff

Can:

- switch only among assigned active locations
- issue stamps and redeem rewards for assigned location
- view limited customer lookup needed for service
- cannot view corporate-wide analytics unless explicitly entitled

### Customer

Customers are not assigned to a location. They can earn/redeem under the corporate business across locations, subject to program rules.

## Program-Location Relationship

### New table: `loyalty_program_locations`

Purpose: optional location scoping for loyalty programs.

Recommended fields:

- `id uuid primary key`
- `business_id uuid not null`
- `loyalty_program_id uuid not null references loyalty_programs(id)`
- `location_id uuid not null references business_locations(id)`
- `status text not null check in ('active', 'inactive')`
- `created_at timestamptz default now()`
- unique `(loyalty_program_id, location_id)`

Rules:

- No rows for a program means corporate-wide program.
- Rows exist means program is available only at mapped active locations.
- Customer cards remain tied to program/business, not location, unless a future requirement asks for location-specific balances.
- Shared customer balances are supported by keeping `customer_loyalty_cards` business/program scoped.

## Location Activity Strategy

Historical location must be recorded at the transaction level, not inferred later from current staff assignment.

Recommended additions:

### `stamp_transactions`

Add nullable `location_id`.

Use it for:

- manual staff stamp issuance
- Quick QR stamp issuance
- future administrative adjustments

Historical rows before Corporate can remain `null`.

### `rewards`

Add:

- `earned_location_id uuid null`
- `redeemed_location_id uuid null`

Reason:

- reward may be earned at one location and redeemed at another
- reporting needs both earned and redeemed location

### Reward redemption transactions

If a redemption/audit transaction table exists, add `location_id`. If not, keep `rewards.redeemed_location_id` and audit log entries.

### `qr_codes`

Add nullable `location_id` and preserve existing rows:

- existing `join_program` rows keep `location_id = null`
- location-specific QR rows include location ID
- QR type can remain `join_program` if route behavior is backward-compatible, or add a type such as `join_program_location`

### Quick QR token metadata

Quick QR tokens should carry `location_id` if generated from a location context.

Required server-side validation:

- token business matches business
- token program belongs to business
- token location belongs to business
- location is active
- generating user has access to the location
- program is available at that location if program-location scoping exists

## Location QR Design

Use existing QR architecture, extended safely:

### Existing QR behavior to preserve

- Existing QR route `/join/[program_id]`
- Existing QR code rows without location
- Existing program-level join behavior

### Corporate additions

- Location QR rows in `qr_codes`:
  - `business_id`
  - `loyalty_program_id`
  - `location_id`
  - `code`
  - `type`
  - `active`
- Location-aware route options:
  - safer option: `/join/[program_id]?location=<location_id>`
  - more durable option: opaque QR code/token that resolves server-side to business/program/location
- Recommended: use opaque QR token for new location QRs so location metadata is not trusted from a URL param alone.

## Quick QR Corporate Inclusion

### Required behavior

Corporate:

- automatically includes Quick QR
- no Quick QR add-on required
- no AWG 10 add-on charge
- works with no `business_addon_subscriptions` row
- no duplicate entitlements if an add-on exists historically

Lower plans:

- keep current Quick QR add-on behavior
- keep current add-on price
- keep current approval and subscription flow

### Recommended entitlement logic

Create or update entitlement resolver to support:

- boolean entitlements:
  - plan true enables feature
  - active approved add-on true enables feature
  - result is boolean OR
- numeric limits:
  - plan base numeric value
  - customer capacity add-ons add to base when approved/active
  - Corporate max locations remains plan base, not add-on contribution unless future add-ons are created

### Billing UI behavior

For Corporate only:

- do not show Quick QR as a purchasable add-on if `quick_stamp_qr` effective entitlement is true through plan.
- if a historical approved Quick QR add-on exists on a Corporate business, show it as included/covered and require a cleanup/cancellation workflow; do not double charge going forward without a billing decision.

For lower plans:

- leave existing Quick QR add-on purchase behavior intact.

## Advanced Analytics Architecture

Corporate analytics should be a separate entitlement-gated module, not a modification of the current basic dashboard.

Entitlement:

- `advanced_analytics = true` for Corporate only.

### Metrics

Allowed based on existing data:

- total customers
- active customers
- new customers by period
- customer growth
- returning customers
- inactive/at-risk customers based on last activity date
- stamps issued
- rewards earned
- rewards redeemed
- redemption rate
- program performance
- activity trends
- location performance
- corporate vs location comparison
- cross-location customer behavior
- top/underperforming locations
- staff activity reporting
- Quick QR activity

Do not assume:

- revenue
- profit
- ROI
- CLV
- payment-derived customer spend

### Query strategy

Do not load entire tables into the browser.

Use server-side RPCs or API endpoints with:

- required `business_id`
- optional `location_id`
- date range
- program filter
- pagination
- aggregation in SQL
- RLS/security checks

### Aggregation strategy

Phase 2 can start with indexed aggregate SQL queries for the Corporate scale:

- 15,000 customers
- 10 locations
- 25 programs
- 50 staff
- large transaction history

Future scale should add materialized daily summaries:

- `business_daily_metrics`
- `location_daily_metrics`
- `program_daily_metrics`
- `staff_daily_metrics`

These should be append/update summaries by day, not browser-side calculations.

## RLS and Security Approach

UI hiding is not enough. Every Corporate path must be enforced server-side.

### Business isolation

All new tables must include `business_id`.

Policies must ensure:

- Super Admin can access all where intended.
- Business owner/corporate admin can access rows for own business.
- Location managers/staff can access only assigned location rows.
- Customers can access only their own customer-facing data.

### Location-scoped authorization

Recommended helper functions:

- `is_business_owner_or_admin(p_business_id uuid)`
- `is_business_operator(p_business_id uuid)`
- `can_access_business_location(p_business_id uuid, p_location_id uuid)`
- `can_manage_business_location(p_business_id uuid, p_location_id uuid)`
- `can_issue_stamp_at_location(p_business_id uuid, p_location_id uuid)`
- `can_view_location_analytics(p_business_id uuid, p_location_id uuid)`

Avoid RLS recursion by not querying the same table inside its own policy. Use SECURITY DEFINER helper functions and separate mapping tables.

### Stamp issuance

Update stamp RPCs rather than trusting direct table inserts:

- manual issuance must validate operator access to business/program/location.
- Quick QR issuance must validate token context and location.
- customer membership/card must belong to same business/program.
- reward creation must remain transactional with stamp issuance.

### Reward redemption

Reward redemption must validate:

- reward belongs to business
- reward belongs to customer/program
- reward is available
- redemption location belongs to business
- staff has access to redemption location
- no double redemption

### Quick QR authorization

Quick QR token generation must require:

- effective `quick_stamp_qr` entitlement
- active business contract/subscription
- location access if location-scoped
- active location
- active program

### Super Admin

Super Admin can inspect/manage Corporate records through admin paths, but all admin actions should be audit logged.

## Audit Trail Design

Use existing `audit_logs` if suitable. Required actions:

- `location_created`
- `location_updated`
- `location_status_changed`
- `location_deactivated`
- `staff_location_assigned`
- `staff_location_removed`
- `staff_default_location_changed`
- `business_user_role_changed`
- `program_location_added`
- `program_location_removed`
- `corporate_stamp_adjustment`
- `corporate_reward_adjustment`
- `quick_qr_location_token_generated`
- `analytics_exported` if export is added later

Audit metadata should include:

- `business_id`
- `location_id`
- `target_user_id` where relevant
- previous values
- new values
- acting admin/user ID
- request source if available

## Required Indexes

### `business_locations`

- unique `(business_id, slug)`
- `(business_id, status)`
- `(business_id, created_at desc)`

### `business_user_locations`

- unique `(business_user_id, location_id)`
- partial unique default location:
  - `(business_user_id) where is_default = true and status = 'active'`
- `(business_id, location_id, status)`
- `(business_id, business_user_id, status)`

### `loyalty_program_locations`

- unique `(loyalty_program_id, location_id)`
- `(business_id, location_id, status)`
- `(business_id, loyalty_program_id, status)`

### `stamp_transactions`

- `(business_id, location_id, created_at desc)`
- `(business_id, loyalty_program_id, location_id, created_at desc)`
- `(business_id, staff_user_id, location_id, created_at desc)`
- `(business_id, customer_id, created_at desc)`

### `rewards`

- `(business_id, earned_location_id, earned_at desc)`
- `(business_id, redeemed_location_id, redeemed_at desc)`
- `(business_id, status, earned_at desc)`

### `qr_codes`

- `(business_id, location_id, type, active)`
- `(business_id, loyalty_program_id, location_id, active)`
- unique active QR constraint should be considered carefully to avoid breaking existing program-only QR behavior.

## Performance Concerns

- Current dashboard counts query base tables directly; Corporate advanced analytics should not copy that pattern for heavy reports without SQL aggregation.
- Customer search should remain server-side limited and indexed.
- Staff and location filters must be pushed into SQL/RPCs.
- Avoid fetching all stamp transactions/rewards into React.
- Use date ranges by default for analytics.
- Use materialized summaries once transaction volume grows beyond interactive aggregate performance.
- Realtime subscriptions should be scoped to business and preferably specific views or recent activity only.

## Regression Risks

### Existing plans

Do not change Trial, Starter, Business, Professional, archived plans, plan prices, lower limits, or add-on behavior.

### Quick QR add-on

Risk: adding plan-level Quick QR could accidentally hide or disable the add-on for lower plans.

Mitigation:

- entitlement resolver must be plan-or-add-on
- billing UI condition only hides Quick QR purchase when effective plan entitlement is true
- lower plans still see and can request Quick QR add-on

### Staff roles

Risk: changing `business_users.role` values could break existing owner/staff checks.

Mitigation:

- first add location assignment table
- keep existing roles operational
- add new role semantics gradually with helper functions

### QR behavior

Risk: changing QR code format breaks existing printed QR codes.

Mitigation:

- do not change existing `JOIN:${programId}` behavior
- add nullable location metadata or opaque tokens for new location QR only
- existing QR rows remain valid

### Customer data

Risk: splitting customers by location would break wallet/card continuity.

Mitigation:

- keep one customer profile and business-scoped card
- location is recorded on activity, not customer identity

### Analytics

Risk: exposing cross-location analytics to location staff.

Mitigation:

- server-side location-scoped functions
- location manager queries constrained by assignment table

## Exact Phase 2 Implementation Plan

Phase 2 should be implementation-focused, but only after approval. It should not alter other plans.

### Step 1 — Confirm Corporate plan ID

Decision needed before implementation:

- Recommended: use existing active `subscription_plans.id = mega_plan` as Corporate.
- Alternative: migrate to `corporate` ID with a careful data migration for businesses referencing `mega_plan`.

Do not create another active Corporate plan until this is decided.

### Step 2 — Extend entitlement registry safely

Add allowed entitlement keys:

- `quick_stamp_qr` boolean
- `advanced_analytics` boolean
- `max_locations` number

Update only the entitlement whitelist/normalization so existing entitlements remain unchanged.

### Step 3 — Add Corporate entitlements only

For `mega_plan` only:

- `quick_stamp_qr = true`
- `advanced_analytics = true`
- `max_locations = 10`
- preserve:
  - `max_customers = 15000`
  - `max_loyalty_programs = 25`
  - `max_staff = 50`
  - price AWG 250
  - active status

Do not touch Trial, Starter, Business, Professional, archived plans, or add-ons.

### Step 4 — Add location schema

Create:

- `business_locations`
- `business_user_locations`
- `loyalty_program_locations`

Add indexes and RLS from the design above.

### Step 5 — Add transaction location columns

Add nullable columns:

- `stamp_transactions.location_id`
- `rewards.earned_location_id`
- `rewards.redeemed_location_id`
- `qr_codes.location_id`

Nullable preserves all historical non-Corporate data.

### Step 6 — Add authorization helpers

Create SECURITY DEFINER helpers for:

- business admin access
- location access
- location management
- stamp issue authorization
- analytics authorization
- effective boolean/numeric entitlement resolution if not already complete

### Step 7 — Update stamp/Quick QR RPCs

Add optional location arguments or token-carried location context:

- manual stamp issuance validates staff location
- Quick QR token generation validates entitlement and location
- Quick QR stamp issuance writes location_id to `stamp_transactions`
- reward earning/redemption records location where relevant

Existing non-location calls must continue to work.

### Step 8 — Add Corporate location management UI

Add under dashboard:

- Locations list
- Create/edit/deactivate location
- Assign staff to location(s)
- Set default location
- Location switcher for assigned users

Gate by `max_locations` and Corporate entitlement.

### Step 9 — Update billing/add-on UI for included Quick QR

For Corporate only:

- show Quick QR as included
- do not show request button for Quick QR add-on
- do not charge Quick QR add-on

For lower plans:

- preserve current add-on purchase flow.

### Step 10 — Add Corporate analytics

Add a Corporate analytics page with server-side aggregation:

- business-wide overview
- location comparison
- program performance
- staff activity
- Quick QR activity
- date range filters
- no revenue/profit/ROI/CLV claims

### Step 11 — Add audit logging

Log all location, staff-location, program-location, entitlement, and critical stamp/reward administrative changes.

### Step 12 — Regression tests

Required tests:

- Trial, Starter, Business, Professional billing unchanged.
- Lower-plan Quick QR add-on purchase still works.
- Corporate Quick QR works without add-on record.
- Corporate is not charged Quick QR add-on.
- Corporate location limit is 10.
- Location manager cannot access unassigned locations.
- Staff cannot issue stamp outside assigned active location.
- Customers can earn/redeem across locations under same business.
- Existing printed QR codes still work.
- Existing non-Corporate stamp and reward flows still work.
- Analytics never loads full transaction tables into browser.

## Stop Point

Phase 1 audit is complete. No implementation was performed.