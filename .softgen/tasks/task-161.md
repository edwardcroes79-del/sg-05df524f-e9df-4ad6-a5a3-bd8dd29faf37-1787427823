---
title: Location stamp attribution
status: in_progress
priority: urgent
type: bug
tags: [stamps, corporate, locations, analytics, supabase]
created_by: agent
created_at: 2026-10-08T19:00:24Z
position: 161
---

## Notes
Audit evidence found `stamp_transactions.location_id` is the storage column used by Corporate Advanced Analytics location filters. Recent stamp rows were persisted with `location_id = NULL`, so Corporate-wide analytics counted them while location-specific analytics did not.

Root cause: the dashboard scanner called `issue_stamp_tx(p_customer_id, p_business_id, p_loyalty_program_id)` without a location argument, and that 3-argument wrapper passed `NULL::uuid` into `issue_stamp_core_tx`. Quick QR generation called `generate_quick_stamp_qr_token(p_business_id, p_loyalty_program_id)`, which inserted tokens without `location_id`, so `quick_stamp_qr_issue_stamp` also wrote NULL location transactions. The canonical core function already supports `p_location_id` and writes it to `stamp_transactions.location_id` plus `rewards.earned_location_id`; the loss happened in wrappers/callers.

Fix applied in `supabase/migrations/20261008191500_staff_stamp_location_attribution.sql` and connected Supabase: added `resolve_stamp_issue_location`, rewired both `issue_stamp_tx` wrappers to resolve/validate server-side location before calling `issue_stamp_core_tx`, and rewired the 2-argument Quick QR token wrapper to resolve a server-side default location. UI scanner and Quick QR pages now pass the active Corporate location when selected, but the database still rejects unauthorized location IDs and can infer a single assigned staff location when no browser selection is provided. Historical stamps are unchanged.

## Checklist
- [x] Audit database schema for stamp transaction location storage, staff-location assignment tables, stamp RPCs, and analytics RPCs
- [x] Trace UI and API callers for staff/admin Issue Stamp, Corporate selected location issuance, and Quick QR issuance
- [x] Identify where location context is lost or trusted incorrectly
- [x] Apply the smallest database/function and application fix so new stamp transactions store the authorized location_id
- [x] Ensure staff cannot manually submit an unauthorized location_id
- [ ] Verify Corporate-wide analytics still aggregates all locations
- [ ] Verify location-specific analytics filters by recorded transaction location
- [ ] Verify Quick QR records the token/location context correctly
- [ ] Run project checks and report root cause, changed files, database objects, security impact, and test coverage

## Acceptance
New staff-issued stamps store the staff member’s authorized location_id in the transaction record.
Corporate Admin selected-location stamps and Quick QR stamps store the intended location_id.
Location-specific analytics includes only stamps for that location while Corporate-wide analytics remains complete.