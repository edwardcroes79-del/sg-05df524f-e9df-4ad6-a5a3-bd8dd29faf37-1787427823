---
title: Quick QR restore for existing plans
status: done
priority: urgent
type: bug
tags: [quick-qr, supabase, rpc, regression]
created_by: agent
created_at: 2026-10-07T17:55:48Z
position: 143
---

## Notes
Restore-only scope completed after confirmed development regression: Quick QR was broken for existing non-Corporate plans and customer scan showed `QR unavailable` with `public.loyalty_program_available_at_location(uuid, uuid, uuid) does not exist`.

Root cause:
- The Corporate/location build introduced location-aware dependencies into the Quick QR customer scan and stamp issuance RPC path.
- The actual development DB function bodies for `get_quick_stamp_qr_context` and `quick_stamp_qr_issue_stamp` were still executing newer location-aware logic, even though existing non-Corporate Quick QR originally used a non-location flow.
- Existing lower-plan Quick QR did not require `loyalty_program_available_at_location(...)` or `user_can_access_business_location(...)` to validate a scan and issue a stamp.
- The customer-facing failure was caused by unresolved Corporate/location RPC dependencies being reached by the existing non-Corporate scan path.

Original Quick QR architecture restored:
- Business admin opens Quick QR.
- Admin generates a short-lived token for an active loyalty program through `generate_quick_stamp_qr_token(p_business_id, p_loyalty_program_id)`.
- Customer scans `/quick-stamp/[token]`.
- `get_quick_stamp_qr_context(p_token)` validates token freshness, business status, contract accessibility, active Quick QR entitlement/add-on, active loyalty program ownership, and customer membership context.
- `quick_stamp_qr_issue_stamp(p_token)` validates customer auth, active membership, cooldown, active business/program, and Quick QR entitlement.
- Stamp issuance is delegated to the existing `issue_stamp_core_tx(...)` transaction function.
- The token is consumed after successful issuance.
- Stamp transaction is saved with `verification_method = 'quick_stamp_qr'`.

What was restored:
- The admin Quick QR page now uses the original non-location token-generation arguments.
- The customer scan RPC no longer depends on Corporate location validation for existing Quick QR.
- The stamp issuance RPC no longer depends on Corporate location-access validation for existing Quick QR.
- A compatibility `loyalty_program_available_at_location(uuid, uuid, uuid)` RPC remains in the migration as an active-program ownership validator so stale callers no longer crash, but the restored existing Quick QR path no longer references it.
- Existing entitlement behavior is preserved through `business_has_active_quick_stamp_qr(p_business_id)`: active Corporate returns true, lower plans still require an active approved Quick QR add-on.

Database/RPC changes:
- Restored/replaced connected development DB function bodies for:
  - `get_quick_stamp_qr_context(p_token uuid)`
  - `quick_stamp_qr_issue_stamp(p_token uuid)`
- Added/restored compatibility functions/grants in `supabase/migrations/20261007180600_quick_qr_rpc_compatibility.sql`:
  - `loyalty_program_available_at_location(uuid, uuid, uuid)`
  - `business_has_active_quick_stamp_qr(uuid)`
  - execute grants for required Quick QR RPCs
  - `NOTIFY pgrst, 'reload schema'`
- Verified the restored live DB function bodies no longer reference:
  - `loyalty_program_available_at_location`
  - `user_can_access_business_location`

Files changed:
- `src/pages/dashboard/quick-stamp-qr.tsx`
- `supabase/migrations/20261007180600_quick_qr_rpc_compatibility.sql`

Security/RLS impact:
- No RLS bypass was added.
- No mock RPC responses were created.
- No frontend-only authorization was added.
- Business isolation remains enforced through business/program ownership checks, `can_access_business(...)` during token generation, active business checks, contract accessibility checks, active entitlement checks, customer membership checks, and `issue_stamp_core_tx(...)`.
- Lower-plan Quick QR add-on rules remain enforced by `business_has_active_quick_stamp_qr(...)`.
- Corporate/location-specific Quick QR work was intentionally stopped for this restore-only task.

Development test result:
- Existing non-Corporate test used a real enabled development business: `Royalty Stamp (Demo)`, subscription plan `pro`, program `Collect & Win`.
- Token generation result: `success = true`.
- Customer scan context result: `success = true`.
- Customer membership result: `has_membership = true`.
- Stamp issuance result: `success = true`.
- Saved transaction: `49b2f790-0041-4273-a1e3-34f6f9a9b78c`.
- App validation passed with no CSS, linting, TypeScript, or server errors.
- The exact known missing-function regression is removed from the restored existing Quick QR path.

Manual phone/browser note:
- The complete backend scan → validation → issue → save path was verified against the connected non-deployed development Supabase database with real existing business/customer data and auth context.
- A physical phone/manual logged-in preview session was not available inside this tool session, so that visual/manual check should be confirmed in the Softgen preview using the same restored flow.

## Checklist
- [x] Trace current admin Quick QR page and customer scan route
- [x] Identify Corporate/location dependency that regressed existing plans
- [x] Restore admin Quick QR token generation to original non-location RPC arguments
- [x] Restore compatibility RPC to original active-program ownership validation for existing Quick QR
- [x] Apply database restore to connected development Supabase and reload PostgREST schema
- [x] Verify Quick QR RPCs exist with compatible signatures and execute permissions
- [x] Run app validation
- [x] Verify existing non-Corporate Quick QR scan flow with a real enabled business/customer session
- [x] Report root cause, restored behavior, database/RPC changes, files changed, security/RLS impact, and test result

## Acceptance
Existing non-Corporate Quick QR no longer fails with `loyalty_program_available_at_location(...) does not exist`.
Customer scan page loads the business/program context for a valid Quick QR token.
A real customer can receive a stamp and the stamp is saved successfully for an existing Quick QR-enabled non-Corporate business.