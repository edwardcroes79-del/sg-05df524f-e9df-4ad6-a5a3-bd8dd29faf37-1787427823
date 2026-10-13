---
title: Safe Business Location Deletion
status: in_progress
priority: high
type: feature
tags: [locations, plans, entitlements, safety]
created_by: agent
created_at: 2026-10-13T18:29:13Z
position: 185
---

## Notes
Add safe Business Admin location deletion and verify duplicated subscription plans remain clean. Scope includes Business Admin → Locations page UI, backend location deletion/retirement safety, duplicated-plan configuration-only behavior, and the existing “Corporate location assignments are not enabled for this business” entitlement path. Requirements: add Delete Location with explicit confirmation, permanent-deletion warning, backend authorization, business-level isolation, active-location cleanup, list/capacity refresh, and dependency-safe handling. If a location has historical stamps, rewards, transactions, staff assignments, or other dependent records, preserve history and block unsafe deletion or provide a safe active-operations removal path. Duplicating a subscription plan must copy only plan configuration and entitlements, never business locations, active-location selections, staff-location assignments, customers, stamps, rewards, or subscriptions. Do not delete production locations during implementation, modify existing subscriptions, run destructive migrations, or deploy automatically. Inspection found no existing delete-location UI. Live schema inspection confirmed location references in `business_user_locations`, `loyalty_program_locations`, `qr_codes`, `quick_stamp_qr_tokens`, `stamp_transactions.location_id`, `rewards.earned_location_id`, and `rewards.redeemed_location_id`; absent probed tables included `staff_location_assignments`, `reward_redemptions`, and `loyalty_cards`. Root cause for duplicated-plan location friction: location management still relied on an auth-dependent numeric entitlement RPC through a service-role API path. The API now reads `plan_entitlements.max_locations` directly after authenticated business access is verified, matching the previous staff-assignment entitlement fix. Safe deletion permanently deletes only locations with no protected dependencies; locations with dependencies are blocked with a clear message and can be removed from active operations using the existing Deactivate action. Plan duplication remains configuration-only through `subscription_plans` and `plan_entitlements`; no business-specific location, assignment, customer, stamp, reward, active-location, or subscription data is copied.

## Checklist
- [x] Inspect Locations page, location API, duplication API, staff-location assignment API, and relevant database relationships
- [x] Identify exact dependencies that make permanent location deletion unsafe and define delete-versus-retire behavior
- [x] Add backend-authorized delete/retire handling with business isolation and dependency checks
- [x] Add Delete Location UI with explicit confirmation, clear warnings, success/error handling, active-location cleanup, and refresh behavior
- [x] Verify duplicated plans copy configuration/entitlements only and location assignment uses configured entitlements, not plan name
- [ ] Run available checks and report root cause, modified files, migrations, and manual test results

## Acceptance
Authorized business owners can remove unused locations safely after explicit confirmation. Locations with historical or dependent records are preserved and removed from active operations only through a safe path. Duplicated plans do not copy business-specific data and can use location management/staff assignment only when their saved entitlements allow it.