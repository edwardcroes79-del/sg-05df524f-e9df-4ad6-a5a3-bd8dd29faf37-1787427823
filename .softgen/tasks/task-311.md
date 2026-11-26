---
title: Anti-fraud protection restoration
status: in_progress
priority: urgent
type: bug
tags: [security, anti-fraud, stamping, supabase]
created_by: agent
created_at: 2026-11-26T12:06:18Z
position: 311
---
## Notes
Original hypothesis (staff-assignment migration overwrote anti-fraud stamping functions) was DISPROVEN by live database evidence:
- `issue_stamp_core_tx` still contains business/location authorization, staff rate limit 2000/hr, customer rate limit 5/60s, per-card advisory lock, per-business cooldown with `anti_fraud_blocked_attempts` logging — identical in structure to `20261015133500_anti_fraud_phase_1.sql`.
- `anti_fraud_blocked_attempt_alert_trigger` is enabled; history intact (32 blocked attempts, 11 alerts).
- Applied staff-assignment migration `20261126111357_migration_0be9cc58.sql` never replaced any stamping function; the larger file `20261126110729_...sql` was never executed.

Real gap found: staff loyalty-card assignment was NOT enforced in the database stamping paths (only in the Search & Send API). Change `sbchg_96f8e5fc503f` added a `staff_can_issue_loyalty_program` check to `issue_stamp_tx` (both overloads), `generate_quick_stamp_qr_token`, and `quick_stamp_qr_issue_stamp`. `issue_stamp_core_tx` was not touched.

Verification concern: the change journal stored no prior bodies (revert plan is DROP ... CASCADE — do NOT use it). Rewritten bodies must be diffed against the latest migration definitions.

Verification result:
- `issue_stamp_tx` (3-arg and 4-arg) live bodies == `20261008191500_staff_stamp_location_attribution.sql` + one `staff_can_issue_loyalty_program` check. Verified.
- `quick_stamp_qr_issue_stamp` live body == `20261008121800_corporate_analytics_location_filter.sql` + one assignment check (token lock, expiry/single-use, cooldown, consumption unchanged). Verified.
- `generate_quick_stamp_qr_token` 2-arg unchanged (delegates to 3-arg). 3-arg pending comparison.
- `generate_quick_stamp_qr_token` 3-arg: no prior migration definition locatable; live body reviewed structurally — auth, program required, business access, location access, active business, add-on, program-at-location, token cleanup, 60s TTL all present, plus the assignment check.

Caller analysis: only `issue_stamp_tx` (both) and `quick_stamp_qr_issue_stamp` call `issue_stamp_core_tx`; all are SECURITY DEFINER, so revoking direct EXECUTE is safe. No app code calls `issue_stamp_core_tx` or legacy `issue_stamp`.

Hardening applied: REVOKE EXECUTE on `issue_stamp_core_tx(uuid,uuid,uuid,uuid,text,uuid)` and legacy `issue_stamp(uuid,uuid,uuid)` from PUBLIC, anon, authenticated (closes caller-supplied staff ID bypass and the no-rate-limit legacy path). Note: this intentionally deviates from the original GRANT in `20261015133500_anti_fraud_phase_1.sql`.

Pre-existing bypasses (pending decision after verification):
- `issue_stamp_core_tx` is EXECUTE-granted to anon/authenticated with a caller-supplied `p_staff_user_id`.
- Legacy `issue_stamp(uuid,uuid,uuid)` is EXECUTE-granted to anon/authenticated and skips all rate limits and cooldown; no app callers.

Test run 1 (single transaction, rolled back):
- T1 unassigned normal: blocked. T2 unassigned quick gen: blocked. T3 assigned normal: stamp added. T4 rapid repeat: anti-fraud cooldown blocked. T10 normal after revocation: blocked. T11 outsider: blocked. T12 direct core/legacy EXECUTE: false; issue_stamp_tx EXECUTE: true.
- Quick Stamp redemption tests skipped (fixture business lacked add-on); rerun with an add-on business.

## Checklist
- [x] Capture live definitions of all stamping functions (pg_get_functiondef)
- [x] Compare against the last anti-fraud migration definitions and the staff-assignment migration
- [x] Identify each removed protection with file/line evidence (none removed)
- [x] Add staff assignment checks to issue_stamp_tx, generate_quick_stamp_qr_token, quick_stamp_qr_issue_stamp
- [x] Diff rewritten function bodies against latest migration definitions
- [x] Close direct-call bypasses on issue_stamp_core_tx and legacy issue_stamp
- [ ] Run SQL-level tests: expired token, reused token, rapid repeat, unassigned card, unauthorized user, legitimate stamp
- [ ] Run check_for_errors

## Acceptance
All anti-fraud checks remain active in the live database.
Staff can only stamp assigned cards through every stamping path, and legitimate stamping works.