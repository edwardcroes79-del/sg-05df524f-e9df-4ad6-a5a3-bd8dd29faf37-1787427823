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
Investigate and restore anti-fraud protection that may have been removed when Staff Loyalty Card Assignment migrations (`20261126110729_staff_loyalty_program_assignments.sql`, `20261126111357_migration_0be9cc58.sql`) replaced stamping functions with CREATE OR REPLACE. Restore must merge original anti-fraud logic with the new staff assignment authorization — do not roll back staff assignment, do not weaken RLS, preserve fraud logs.

Hypothesis: `issue_stamp_tx`, `generate_quick_stamp_qr_token`, and `quick_stamp_qr_issue_stamp` were rewritten from pre-anti-fraud base versions, dropping rate limits, duplicate-scan checks, and security alert logging from `20261015133500_anti_fraud_phase_1.sql` / `20261015141000_anti_fraud_security_alerts.sql` and their applied variants.

## Checklist
- [ ] Capture live definitions of all stamping functions (pg_get_functiondef)
- [ ] Compare against the last anti-fraud migration definitions and the staff-assignment migration
- [ ] Identify each removed protection with file/line evidence
- [ ] Write a merge migration restoring anti-fraud logic plus staff assignment checks
- [ ] Apply migration, regenerate types, run check_for_errors
- [ ] Run SQL-level tests: expired token, reused token, rapid repeat, unassigned card, unauthorized user, legitimate stamp

## Acceptance
All anti-fraud checks that existed before staff assignment are active again in the live database.
Staff can still only stamp assigned cards, and legitimate stamping works.