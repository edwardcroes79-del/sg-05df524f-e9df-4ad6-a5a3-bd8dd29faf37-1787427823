---
title: Quick Stamp QR Availability Resolver
status: in_progress
priority: urgent
type: bug
tags: [quick-stamp, qr, addons, entitlements]
created_by: agent
created_at: 2026-10-15T00:13:46Z
position: 211
---

## Notes
Bug: the Rotating Quick Issue Stamp QR component reported "Quick Stamp QR add-on is not active for this business" even though backend plan entitlement/configuration showed Quick Stamp QR enabled. Inspection confirmed the page calls `generate_quick_stamp_qr_token(...)`, and that RPC returns the unavailable message when `public.business_has_active_quick_stamp_qr(p_business_id)` returns false. The live resolver only returned true for hardcoded `mega_plan` or a paid active add-on row, so any business/plan enabled through the established `plan_entitlements` key `quick_stamp_qr` but not named `mega_plan` failed token generation. Fix applied in migration `supabase/migrations/20261015001500_quick_stamp_qr_entitlement_resolver.sql`: `business_has_active_quick_stamp_qr` now first verifies the business is active and contract-accessible, then honors `get_business_boolean_entitlement(p_business_id, 'quick_stamp_qr', false)`, and still falls back to the existing active approved Quick Stamp add-on subscription check. No business names are hardcoded, no global grant was added, and token generation, program/location validation, QR rotation, and stamp issuance remain handled by the existing RPC chain.

## Checklist
- [x] Inspect Quick Stamp QR component and unavailable message source
- [x] Inspect related API calls and add-on/entitlement resolver logic
- [x] Inspect live add-on, plan, business activation, and business ID records
- [x] Identify the exact runtime condition returning inactive
- [x] Apply the smallest resolver/check fix without bypassing authorization
- [ ] Verify entitled and activated business can use Quick Stamp QR
- [ ] Verify non-entitled or inactive business remains blocked
- [ ] Verify selected program, 60-second rotation, and QR issuance paths remain intact
- [ ] Run validation and report root cause, files changed, and test results

## Acceptance
A business with the Quick Stamp QR add-on properly entitled and activated can open/use the rotating Quick Issue Stamp QR. Businesses without the required entitlement or activation still see the unavailable state. QR rotation and secure stamp issuance behavior remain unchanged.