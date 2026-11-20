---
title: Configurable trial period settings
status: in_progress
priority: urgent
type: feature
tags: [superadmin, trials, subscriptions, settings]
created_by: agent
created_at: 2026-11-20T14:05:55Z
position: 286
---
## Notes
Add a central Superadmin-managed trial period setting to the existing subscription settings flow. The setting must allow enabling/disabling free trials, choosing 7/14/30 days, or entering a custom number of days. Only new business registrations should use the current setting. Existing businesses must remain unchanged. Paid subscriptions, payment approval, renewals, and Account On Hold must remain untouched.

The setting must be stored in the database and validated server-side. Only authorized SuperAdmins may update it. When trials are disabled, new businesses must not receive a free trial and must instead choose a paid subscription path. If a business already has an active paid subscription, it must never be replaced by a trial.

Additional homepage requirement:
- Update public homepage marketing text from 14-day free trial to 7-day free trial where visible.
- CTA copy must stay consistent with the actual centrally configured Superadmin trial setting.
- Do not hardcode a separate registration-system trial duration.

Initial inspection findings (2026-11-20):
- `businesses` already stores `trial_start`, `trial_end`, `subscription_plan`, `subscription_status`, and `status`.
- `subscription_plans` already stores `is_trial` and `trial_days`, but the new requirement is for one central platform setting that applies only to new registrations.
- `website_settings` already exists with public read and SuperAdmin write access, making it the smallest central settings store for this feature.
- `src/pages/api/auth/register-business.ts` only generates the business signup confirmation email; it does not assign any trial dates itself, so the actual trial assignment path must be elsewhere.
- `src/pages/onboarding.tsx` creates new businesses with `status: "pending"` and `subscription_plan: "starter"` but does not set `trial_start`, `trial_end`, or `subscription_status`.
- `src/pages/api/admin/approve-business.ts` approves pending businesses by setting `status: "active"` and approval audit fields only; it explicitly preserves existing plan, trial, and subscription fields and does not create a trial.
- `src/pages/index.tsx` now reads `website_settings.key = 'trial_period_settings'` for homepage trial promotion copy, defaults to a 7-day free trial when the setting is absent, and changes CTA copy/destination to pricing when trials are disabled. `check_for_errors` passed after this homepage-only update.

## Checklist
- [ ] Inspect current trial registration flow, trial_end usage, subscription status logic, and Superadmin subscription settings UI
- [x] Inspect database tables and centralized settings storage used for subscription configuration
- [ ] Add centrally stored trial period settings with server-side validation and Superadmin-only update access
- [ ] Update new business registration flow to use the configured trial days only for new registrations
- [ ] Ensure disabled trials prevent new free-trial assignment without altering paid subscription handling
- [ ] Add Superadmin UI for Trial Period Settings in existing subscription settings
- [x] Update public homepage trial promotion text to match the centrally configured trial duration
- [ ] Verify enabled and disabled trial scenarios and confirm existing businesses remain unchanged

## Acceptance
Superadmin can configure trial settings centrally without redeploying.
Only new business registrations use the configured trial period or disabled-trial behavior.
Existing business trial dates, subscriptions, renewals, and On Hold behavior remain unchanged.