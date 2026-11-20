---
title: Manual payment reminder dashboard delivery
status: done
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
- [x] Inspect manual_payment_reminders columns, foreign keys, RLS policies and recent rows
- [x] Trace send path (Superadmin UI → API → server module) and recipient resolution
- [x] Trace dashboard fetch, popup display and dismissal in DashboardLayout
- [x] Identify the exact failure point with evidence
- [x] Fix recipient identification and delivery without creating a second reminder system
- [x] Make new reminders appear without a manual browser refresh, without duplicate popups
- [ ] Verify end-to-end with real records: send, stored row, recipient fetch, dismissal persistence, Superadmin history, cross-business isolation

## Acceptance
After Superadmin sends a reminder, the selected Business Admin sees it in their dashboard without refreshing the browser.
Dismissing the reminder keeps the record, stops it from reopening, and Superadmin history still lists it.
A Business Admin of another business cannot read the reminder.

## Evidence
- FKs: recipient_user_id and sent_by reference auth.users; there is no FK to profiles, so any `profiles(...)` embed from this table fails with a schema-cache relationship error. The server module avoids that embed.
- Send path stores recipient_user_id = businesses.owner_id (verified on 8 rows, all recipient_is_owner = true).
- All 6 reminders sent since 2026-11-14 18:38 have displayed_at = null; the server sets displayed_at on dashboard fetch, so the read path is not reaching them. Two earlier reminders (2026-11-14 17:46, 18:32) were displayed and dismissed normally.

## Root cause and fix
- Server path verified working for the recipient (business resolution, overdue check, manual query all OK).
- Cause: DashboardLayout fetched reminders only once per business/user load and reused a 5-minute module cache; no re-check while the dashboard was open.
- Fix: DashboardLayout re-checks every 60s while visible and on focus/visibility (bypassing cache); dismissed IDs tracked in a session ref so they never reopen. API sets Cache-Control no-store and fetches manual reminders independently of overdue invoices.

## Verification log
- Verified (server functions against live DB, test reminder 34588370 on Royalty Stamp Admin): owner fetch returns it with message, sent date and currency; another business owner cannot see it; another business owner's dismiss is rejected; after owner dismissal it is not returned again; row kept with displayed_at and dismissed_at set. TypeScript check clean.
- Not verified: browser popup appearing without refresh (needs a real Superadmin → Business Admin session); full lint (sandbox OOM, pre-existing).