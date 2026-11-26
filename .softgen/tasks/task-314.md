---
title: Non-essential automatic email disablement
status: todo
priority: high
type: bug
tags: [email, notifications, stamping]
created_by: agent
created_at: 2026-11-26T18:38:28Z
position: 314
---
## Notes
Disable automatic outgoing emails for customer stamp notifications, reward notifications, setup assistance updates, payment reminders, account hold notices, and all other non-allowed application emails without breaking the underlying product workflows. Stamping, quick stamping, rewards, subscription logic, and dashboard activity must still work exactly as before.

## Checklist
- [ ] Disable customer stamp emails for normal Issue Stamp and Quick Issue Stamp
- [ ] Disable reward, setup assistance, upgrade/add-on, payment, account hold, and other non-allowed automatic emails
- [ ] Ensure disabled events do not queue or retry for SMTP delivery
- [ ] Preserve all existing non-email side effects, including database writes and in-app notifications
- [ ] Verify no unauthorized app-managed email paths remain

## Acceptance
Stamping, rewards, setup flows, and billing-related product actions still work without sending non-allowed emails.
Disabled email events no longer hit SMTP or an app-managed retry path.