---
title: Corporate RPC console errors
status: done
priority: urgent
type: bug
tags: [corporate-plan, rpc, quick-qr, locations, supabase]
created_by: agent
created_at: 2026-10-07T14:51:29Z
position: 139
---

## Notes
Fixed only the reported Corporate console errors by reconciling two RPC root causes in the real Supabase database and persisting the fix in `supabase/migrations/20261007145500_fix_corporate_rpc_contracts.sql`.

Root cause A:
- `public.user_can_manage_business_location(p_business_id uuid, p_location_id uuid, p_user_id uuid)` was missing or incompatible for the location-management caller, causing PostgREST schema-cache RPC resolution failures during location save/edit flows.
- Fixed by creating/replacing the secure RPC with the exact three-uuid signature.
- The function verifies the target location belongs to the requested business, allows Super Admin, allows the Corporate business owner for `mega_plan`, and allows active assigned `location_manager` / `corporate_admin` location assignments only for the same business/location.

Root cause B:
- The Quick QR RPC chain was missing or incompatible: `public.business_has_active_quick_stamp_qr(p_business_id uuid)` called/depended on `public.get_business_boolean_entitlement(p_business_id uuid, p_key text, p_fallback boolean)`, which PostgREST could not resolve from the app request path.
- Fixed by creating/replacing both functions with stable signatures.
- Corporate `mega_plan` receives Quick QR through the existing `quick_stamp_qr` plan entitlement and does not require the AWG 10 add-on.
- Lower-plan behavior remains unchanged: lower plans still return `true` only through the existing active/approved Quick QR add-on subscription path.

Exact functions fixed:
- `public.get_business_boolean_entitlement(uuid, text, boolean) returns boolean`
- `public.business_has_active_quick_stamp_qr(uuid) returns boolean`
- `public.user_can_manage_business_location(uuid, uuid, uuid) returns boolean`

Migration changes:
- Added `supabase/migrations/20261007145500_fix_corporate_rpc_contracts.sql`.
- Grants execute access to authenticated users for the three RPCs.
- Sends `NOTIFY pgrst, 'reload schema'` to refresh the PostgREST schema cache.

RLS/security changes:
- No RLS weakening.
- Functions are `SECURITY DEFINER` but explicitly enforce authenticated business membership/ownership, Corporate plan ownership for location management, assigned-location authorization, and business/location ownership.
- Cross-business location management is rejected by the location ownership check.
- Lower-plan Quick QR behavior remains gated by existing add-on subscription state.

Verification results:
- Project checks passed with no CSS, linting, TypeScript, or server errors.
- Authenticated Corporate owner context:
  - `get_business_boolean_entitlement(corporate, 'quick_stamp_qr', false)` returned `true`.
  - `business_has_active_quick_stamp_qr(corporate)` returned `true`.
  - `user_can_manage_business_location(corporate_business, corporate_location, corporate_owner)` returned `true`.
  - Random user against the same Corporate location returned rejected/`false`.
- Authenticated lower-plan trial owner context:
  - `get_business_boolean_entitlement(trial, 'quick_stamp_qr', false)` returned `false`.
  - `business_has_active_quick_stamp_qr(trial)` returned `false`.
- Schema cache reload was sent through `NOTIFY pgrst, 'reload schema'`.
- Direct browser click testing still requires an active logged-in Corporate Admin session in the preview, but the actual production database functions that produced the console RPC errors now resolve and return the expected secure results.

## Checklist
- [x] Inspect live production function catalog and exact signatures for location and Quick QR RPCs
- [x] Inspect existing callers and migrations for the intended function contracts
- [x] Fix missing/incompatible location authorization function securely
- [x] Fix missing/incompatible Quick QR entitlement function chain securely
- [x] Refresh PostgREST schema cache if functions are created or changed
- [x] Verify Corporate location save and Quick QR RPC behavior against real database functions
- [x] Verify lower-plan Quick QR behavior and business/location isolation remain unchanged
- [x] Run project checks and report root causes, signatures, DB changes, security changes, and test results

## Acceptance
Corporate Admin can create a real location without the location RPC error.
Corporate Quick QR loads without RPC errors and does not require the AWG 10 add-on.
Lower-plan Quick QR behavior remains unchanged.