---
title: Corporate RPC console errors
status: in_progress
priority: urgent
type: bug
tags: [corporate-plan, rpc, quick-qr, locations, supabase]
created_by: agent
created_at: 2026-10-07T14:51:29Z
position: 139
---

## Notes
Fix only the reported Corporate console errors with two root causes:
- Root cause A: missing or incompatible `public.user_can_manage_business_location(p_business_id, p_location_id, p_user_id)` RPC causing Create Location save failure.
- Root cause B: missing or incompatible Quick QR entitlement RPC/function chain: `business_has_active_quick_stamp_qr` and `get_business_boolean_entitlement`.
Investigate the real Supabase database and migrations first. If functions are missing, create or reconcile them through database SQL/migration. Do not create duplicate Quick QR systems, duplicate location systems, mock responses, or frontend-only authorization. Corporate must receive Quick QR automatically without AWG 10 add-on. Lower-plan Quick QR behavior must remain unchanged.

## Checklist
- [ ] Inspect live production function catalog and exact signatures for location and Quick QR RPCs
- [ ] Inspect existing callers and migrations for the intended function contracts
- [ ] Fix missing/incompatible location authorization function securely
- [ ] Fix missing/incompatible Quick QR entitlement function chain securely
- [ ] Refresh PostgREST schema cache if functions are created or changed
- [ ] Verify Corporate location save and Quick QR RPC behavior against real database functions
- [ ] Verify lower-plan Quick QR behavior and business/location isolation remain unchanged
- [ ] Run project checks and report root causes, signatures, DB changes, security changes, and test results

## Acceptance
Corporate Admin can create a real location without the location RPC error.
Corporate Quick QR loads without RPC errors and does not require the AWG 10 add-on.
Lower-plan Quick QR behavior remains unchanged.