---
title: Owner Security Alerts Dashboard
status: todo
priority: high
type: feature
tags: [dashboard, alerts, anti-fraud]
created_by: agent
created_at: 2026-10-15T13:57:40Z
position: 221
---

## Notes
Add a Security Alerts or Security Activity section to the existing Business Owner/Admin dashboard using current design/navigation conventions. Only authorized Owner/Admin users for the relevant business may read alerts or mark them read. Staff must not access or mutate alerts through UI or direct API requests. UI should show staff fallback, member name/identifier, loyalty program, blocked attempt count, first/latest timestamps, repeated cooldown reason, read/unread status, empty/loading/error states, unread badge, detail view, and mark-as-read action. Use existing realtime if present; otherwise use lightweight refresh. No email/SMS/external notifications.

## Checklist
- [ ] Add secure API to list security alerts for an authorized business Owner/Admin
- [ ] Add secure API to mark an alert as read for an authorized business Owner/Admin
- [ ] Add dashboard Security Alerts/Activity UI with empty, loading, and error states
- [ ] Display staff, member, identifier, program, attempt count, first/latest timestamps, reason, and read status
- [ ] Add unread badge in dashboard navigation or dashboard section
- [ ] Add alert detail/review interaction
- [ ] Prevent Staff UI access while preserving server-side denial

## Acceptance
Authorized Owner/Admin users can review repeated cooldown-blocked attempt alerts and mark them read. Staff and other businesses cannot access or mutate alerts.