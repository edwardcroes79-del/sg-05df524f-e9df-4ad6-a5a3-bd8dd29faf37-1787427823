---
title: Staff Identity Alert Bug Fix
status: in_progress
priority: urgent
type: bug
tags: [anti-fraud, alerts, staff, dashboard]
created_by: agent
created_at: 2026-10-15T15:07:03Z
position: 225
---

## Notes
Focused bug fix for anti-fraud Security Alert Details modal showing “Staff identity unavailable.” Inspection found alert/block rows preserve `staff_user_id`; the recent blocked attempts have active same-business `business_users` membership for the staff user, but no matching `profiles` row. The existing security-alert API only looked up `profiles.full_name/email`, so it returned the unavailable fallback even though the authoritative Supabase Auth account exists. The smallest fix updates `src/pages/api/business/security-alerts.ts` to keep the same business-membership/owner guard and resolve the exact `staff_user_id` through `auth.admin.getUserById` when the profile row is missing or incomplete. It does not substitute another staff member or owner. No schema, alert, cooldown, stamping, reward, customer, transaction, or realtime behavior was changed.

## Checklist
- [x] Inspect current security-alert API and modal rendering
- [x] Inspect actual staff identity fields on blocked attempts and alert records
- [x] Inspect staff/account/business-membership schema and relationships
- [x] Identify whether staff ID is missing, incorrect, joined through the wrong relationship, or not displayed
- [x] Apply the smallest safe fix to resolve same-business staff name and email
- [ ] Verify missing-name and missing-email fallbacks
- [ ] Verify existing alert details and read/unread state remain unchanged
- [ ] Run project checks and document browser/modal verification limits

## Acceptance
The Security Alert Details modal shows the correct same-business staff full name and email when resolvable, shows safe fallbacks only when genuinely unavailable, preserves alert behavior, and the report lists root cause, files changed, migrations, and actual verification results.