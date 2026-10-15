---
title: Quick Stamp QR Availability Resolver
status: done
priority: urgent
type: bug
tags: [quick-stamp, qr, addons, entitlements]
created_by: agent
created_at: 2026-10-15T00:13:46Z
position: 211
---

## Notes
Fixed the Quick Issue Stamp QR availability discrepancy. Root cause: the Rotating Quick Issue Stamp QR page calls `generate_quick_stamp_qr_token(...)`, and that RPC returns "Quick Stamp QR add-on is not active for this business" when `public.business_has_active_quick_stamp_qr(p_business_id)` returns false. The live resolver only returned true for hardcoded `mega_plan` or a paid active add-on row, so businesses/plans enabled through the established `plan_entitlements` key `quick_stamp_qr` failed token generation unless they also matched the hardcoded plan/add-on path. Fix applied in `supabase/migrations/20261015001500_quick_stamp_qr_entitlement_resolver.sql`: `business_has_active_quick_stamp_qr` now first verifies the business is active and contract-accessible, then honors `get_business_boolean_entitlement(p_business_id, 'quick_stamp_qr', false)`, and still falls back to the existing active approved Quick Stamp add-on subscription check. No business names are hardcoded, no global grant was added, and token generation, selected program validation, location validation, QR rotation, and stamp issuance remain handled by the existing RPC/page flow. Verification in the current environment showed plan-entitled businesses (`Test 13 Oct`, `Botica Benu`, `Royalty Stamp (Demo)`) now return true; a business with an active approved add-on (`Happy Stop 2`) returns true; non-entitled/non-addon businesses (`Alora Creations`, `Sugarlips&Sips`, `Majestic297 barber studio`, `Everon technical services`, `Juicy by Shaye`, `Nailsbyshanyy`, `Royalty Stamp Admin`) remain false. `check_for_errors` passed. Supabase tracked change: `sbchg_a0385b16e624` marked manual review required. Production deployment requires applying the reviewed migration to production before publishing.

## Checklist
- [x] Inspect Quick Stamp QR component and unavailable message source
- [x] Inspect related API calls and add-on/entitlement resolver logic
- [x] Inspect live add-on, plan, business activation, and business ID records
- [x] Identify the exact runtime condition returning inactive
- [x] Apply the smallest resolver/check fix without bypassing authorization
- [x] Verify entitled and activated business can use Quick Stamp QR
- [x] Verify non-entitled or inactive business remains blocked
- [x] Verify selected program, 60-second rotation, and QR issuance paths remain intact
- [x] Run validation and report root cause, files changed, and test results

## Acceptance
A business with the Quick Stamp QR add-on properly entitled and activated can open/use the rotating Quick Issue Stamp QR. Businesses without the required entitlement or activation still see the unavailable state. QR rotation and secure stamp issuance behavior remain unchanged.