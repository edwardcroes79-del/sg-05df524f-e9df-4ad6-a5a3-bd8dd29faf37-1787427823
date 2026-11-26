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

Pre-existing bypasses (pending decision after verification):
- `issue_stamp_core_tx` is EXECUTE-granted to anon/authenticated with a caller-supplied `p_staff_user_id`.
- Legacy `issue_stamp(uuid,uuid,uuid)` is EXECUTE-granted to anon/authenticated and skips all rate limits and cooldown; no app callers.

## Checklist
- [x] Capture live definitions of all stamping functions (pg_get_functiondef)
- [x] Compare against the last anti-fraud migration definitions and the staff-assignment migration
- [x] Identify each removed protection with file/line evidence (none removed)
- [x] Add staff assignment checks to issue_stamp_tx, generate_quick_stamp_qr_token, quick_stamp_qr_issue_stamp
- [ ] Diff rewritten function bodies against latest migration definitions
- [ ] Close direct-call bypasses on issue_stamp_core_tx and legacy issue_stamp
- [ ] Run SQL-level tests: expired token, reused token, rapid repeat, unassigned card, unauthorized user, legitimate stamp
- [ ] Run check_for_errors

## Acceptance
All anti-fraud checks remain active in the live database.
Staff can only stamp assigned cards through every stamping path, and legitimate stamping works.