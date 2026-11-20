---
title: Seven-day business trial enforcement
status: in_progress
priority: urgent
type: bug
tags: [trial, billing, dashboard, supabase]
created_by: agent
created_at: 2026-11-20T14:37:45Z
position: 287
---

## Notes
The public Home page advertises a 7-day free trial, but authenticated Business Dashboard displays 14-day trial wording and countdowns. Inspect Supabase trial fields, registration/approval logic, dashboard displays, and configured Superadmin Trial Period Settings. The configured trial duration must be 7 days and remain centrally controlled by Superadmin settings. Existing active free trials that were created as 14-day trials must have trial_end recalculated as original trial_start + 7 days, not today + 7 days. Do not modify paid subscriptions, expired subscriptions, contract start/end dates, invoices, payment records, account On Hold logic, unrelated dashboard functionality, RLS, or authorization policies.

## Checklist
- [x] Inspect Supabase schema and current trial-related fields/settings
- [x] Locate registration, business approval, trial settings, and dashboard trial display code paths
- [x] Centralize dashboard and registration logic around the configured trial duration
- [x] Update hardcoded 14-day trial wording/countdowns to configured 7-day trial wording/countdowns
- [ ] Recalculate active free-trial business trial_end values from original trial_start + configured duration
- [ ] Verify existing active trial, new registration logic, and matching dashboard banner/card countdowns

## Acceptance
The Business Dashboard top trial banner and trial information card show the same remaining days and expiration date based on the database trial_end.
New business approvals/registrations receive the configured 7-day trial duration from Superadmin settings.
Existing active free trials created with 14 days are shortened to trial_start + 7 days without changing paid subscriptions, expired subscriptions, contract dates, invoices, payments, hold logic, or RLS.