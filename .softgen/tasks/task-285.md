---
title: Manual payment reminder dashboard delivery
status: in_progress
priority: urgent
type: bug
tags: [billing, superadmin, notifications, dashboard]
created_by: agent
created_at: 2026-11-20T11:50:00Z
position: 285
---
## Notes
Superadmin "Send Manual Payment Reminder" reports success, but the selected Business Admin never sees the reminder in their dashboard. Trace the full path (business selection, recipient resolution, insert, dashboard fetch, popup, dismissal) and fix the actual failure point. Also investigate the earlier schema-cache relationship error between manual_payment_reminders and profiles using real foreign keys. Reuse the existing reminder table, existing dashboard popup in DashboardLayout and existing dismissal. Dismissal must not delete records; Superadmin keeps history. Business Admins only see their own business's reminders. Do not touch automatic overdue reminders, invoices, contracts, payment statuses, account holds or loyalty flows. Do not weaken RLS.

## Checklist
- [ ] Inspect manual_payment_reminders columns, foreign keys, RLS policies and recent rows
- [ ] Trace send path (Superadmin UI → API → server module) and recipient resolution
- [ ] Trace dashboard fetch, popup display and dismissal in DashboardLayout
- [ ] Identify the exact failure point with evidence
- [ ] Fix recipient identification and delivery without creating a second reminder system
- [ ] Make new reminders appear without a manual browser refresh, without duplicate popups
- [ ] Verify end-to-end with real records: send, stored row, recipient fetch, dismissal persistence, Superadmin history, cross-business isolation

## Acceptance
After Superadmin sends a reminder, the selected Business Admin sees it in their dashboard without refreshing the browser.
Dismissing the reminder keeps the record, stops it from reopening, and Superadmin history still lists it.
A Business Admin of another business cannot read the reminder.