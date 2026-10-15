---
title: Staff Identity in Security Alerts
status: done
priority: high
type: feature
tags: [anti-fraud, alerts, staff, dashboard]
created_by: agent
created_at: 2026-10-15T14:52:17Z
position: 224
---

## Notes
Improved existing anti-fraud dashboard alerts so authorized Business Owner/Admin users can clearly identify the staff member responsible for repeated cooldown-blocked stamp attempts. The implementation uses authoritative server-side profile and business relationship records only; browser-supplied names/emails are not trusted. `src/pages/api/business/security-alerts.ts` now exposes staff profile name/email only when `staff_user_id` is the alert business owner or has an active `business_users` row for the same alert business. `src/pages/dashboard/security-alerts.tsx` now displays staff full name as the primary label, email beneath it when available, and safe fallbacks when either or both fields are missing. Missing staff identity does not hide or discard alerts. Cooldown logic, alert trigger, attempt count, read/unread state, dashboard refresh behavior, Owner/Admin authorization, business isolation, stamp issuance, reward redemption, customer records, unrelated features, and notifications were not changed.

Rollback-only SQL validation passed for: staff name + email available; missing name falls back to email; missing email keeps name and exposes no email; missing name and email keeps the alert visible with “Staff identity unavailable”; identity display checks do not change attempt count, read state, or alert status; and the business-scoped identity guard prevents exposing unrelated profile identity. The sandbox did not have an unrelated profile fixture for a full cross-business row simulation, but the API guard requires owner or active same-business `business_users` membership before exposing identity. `check_for_errors` passed with no CSS, linting, type checking, or server errors. Browser refresh persistence was not manually clicked in an authenticated preview session, but no persistence schema or read/write behavior was changed. No deployment was performed.

## Checklist
- [x] Inspect current security-alert API, dashboard alert UI, staff/account schema, and business-user relationships
- [x] Return staff full name and email from server-side business-scoped joins or safe lookups
- [x] Update dashboard alert list/detail UI to show staff name as primary label and email beneath it
- [x] Add fallbacks for missing name, missing email, and fully unavailable staff identity
- [x] Verify attempt counts/read state remain unchanged and alerts remain visible
- [x] Verify business isolation prevents another business from seeing staff identity
- [x] Run project checks and document actual SQL/UI verification limits

## Acceptance
Authorized Owner/Admin users see the responsible staff member's name and email on each anti-fraud alert when available, safe fallbacks otherwise, without changing alert grouping, cooldown enforcement, or business isolation.