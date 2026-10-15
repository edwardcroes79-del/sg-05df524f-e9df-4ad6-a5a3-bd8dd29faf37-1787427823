---
title: Staff Identity Alert Bug Fix
status: done
priority: urgent
type: bug
tags: [anti-fraud, alerts, staff, dashboard]
created_by: agent
created_at: 2026-10-15T15:07:03Z
position: 225
---

## Notes
Focused bug fix for anti-fraud Security Alert Details modal showing “Staff identity unavailable.” Root cause: alert/block rows preserve the correct `staff_user_id`, and the recent blocked attempts have active same-business `business_users` membership for that staff user, but the staff user has no matching `profiles` row. The existing security-alert API only looked up `profiles.full_name/email`, so it returned the unavailable fallback even though the authoritative Supabase Auth account exists. The smallest safe fix updates `src/pages/api/business/security-alerts.ts` to keep the same business-membership/owner guard and resolve the exact `staff_user_id` through `auth.admin.getUserById` when the profile row is missing or incomplete. It does not substitute another staff member or owner. No schema, alert, cooldown, stamping, reward, customer, transaction, or realtime behavior was changed.

Actual validation completed: SQL confirmed 1 current alert has same-business active staff membership plus Supabase Auth identity but no profile row; that alert is resolvable by Auth email and Auth name. `check_for_errors` passed with no CSS, linting, type checking, or server errors. The code path preserves attempt count, timestamps, cooldown window, alert status, and read/unread fields because only staff identity hydration changed. Missing-name/missing-email fallbacks are implemented in the API response logic: profile name/email take priority, Auth metadata/email fill missing values, and “Staff identity unavailable” is used only if the same-business identity cannot resolve either field. Browser/modal click-through was not executed in an authenticated Owner/Admin preview session, so the final UI must still be confirmed by refreshing the dashboard and opening the alert details modal. No deployment was performed.

## Checklist
- [x] Inspect current security-alert API and modal rendering
- [x] Inspect actual staff identity fields on blocked attempts and alert records
- [x] Inspect staff/account/business-membership schema and relationships
- [x] Identify whether staff ID is missing, incorrect, joined through the wrong relationship, or not displayed
- [x] Apply the smallest safe fix to resolve same-business staff name and email
- [x] Verify missing-name and missing-email fallback logic in the API code path
- [x] Verify existing alert details and read/unread state remain unchanged by the code change
- [x] Run project checks and document browser/modal verification limits

## Acceptance
The Security Alert Details modal should show the correct same-business staff full name and email when resolvable, shows safe fallbacks only when genuinely unavailable, preserves alert behavior, and the report lists root cause, files changed, migrations, and actual verification results.