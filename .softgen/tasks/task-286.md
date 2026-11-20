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

The setting must be stored in the database and validated server-side. Only authorized Superadmins may update it. When trials are disabled, new businesses must not receive a free trial and must instead choose a paid subscription path. If a business already has an active paid subscription, it must never be replaced by a trial.

## Checklist
- [ ] Inspect current trial registration flow, trial_end usage, subscription status logic, and Superadmin subscription settings UI
- [ ] Inspect database tables and centralized settings storage used for subscription configuration
- [ ] Add centrally stored trial period settings with server-side validation and Superadmin-only update access
- [ ] Update new business registration flow to use the configured trial days only for new registrations
- [ ] Ensure disabled trials prevent new free-trial assignment without altering paid subscription handling
- [ ] Add Superadmin UI for Trial Period Settings in existing subscription settings
- [ ] Verify enabled and disabled trial scenarios and confirm existing businesses remain unchanged

## Acceptance
Superadmin can configure trial settings centrally without redeploying.
Only new business registrations use the configured trial period or disabled-trial behavior.
Existing business trial dates, subscriptions, renewals, and On Hold behavior remain unchanged.