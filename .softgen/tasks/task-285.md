---
title: Manual payment reminder dashboard delivery
status: in_progress
priority: urgent
type: bug
tags: [billing, reminders, dashboard, superadmin]
created_by: agent
created_at: 2026-11-20T12:08:23Z
position: 285
---
## Notes
Fix the existing manual payment reminder path end to end so reminders sent by Superadmin appear in the intended Business Admin dashboard, persist until dismissed, and remain isolated by business. Extend the same existing reminder system with authorized Superadmin deletion of previously sent reminders from reminder history.

Deletion requirements:
- Add a Delete action to each reminder in the existing Superadmin reminder history.
- Require a confirmation dialog that identifies the business and reminder.
- Prefer soft deletion/archive over hard delete.
- Record which Superadmin archived the reminder and when.
- Archived reminders must stop appearing in Business Admin dashboards, including after login or refresh.
- Only authorized Superadmins can archive reminders.
- Businesses must never archive or remove Superadmin reminder history.
- Do not delete invoices, payment records, contracts, or unrelated notifications.
- Allow Superadmin to view archived reminders if the current history view can support it without creating a second management system.

## Checklist
- [x] Inspect manual_payment_reminders columns, foreign keys, RLS policies and recent rows
- [x] Trace send path (Superadmin UI → API → server module) and recipient resolution
- [x] Trace dashboard fetch, popup display and dismissal in DashboardLayout
- [x] Identify the exact failure point with evidence
- [x] Fix recipient identification and delivery without creating a second reminder system
- [x] Make new reminders appear without a manual browser refresh, without duplicate popups
- [ ] Inspect current reminder history UI and database support for soft deletion/archive
- [ ] Add archive metadata to manual_payment_reminders and exclude archived reminders from Business Admin delivery
- [ ] Add Superadmin archive/delete action with confirmation dialog in existing reminder history
- [ ] Enforce server-side authorization so only Superadmins can archive reminders
- [ ] Verify archived reminders disappear from Business Admin dashboard and remain available to Superadmin history
- [ ] Verify end-to-end with real records: send, stored row, recipient fetch, dismissal persistence, Superadmin history, cross-business isolation, archive behavior

## Acceptance
After Superadmin sends a reminder, the selected Business Admin sees it in their dashboard without refreshing the browser.
Dismissing the reminder keeps the record, stops it from reopening, and Superadmin history still lists it.
A Business Admin of another business cannot read the reminder.
A Superadmin can archive a previously sent reminder, and that archived reminder no longer appears in the Business Admin dashboard while its archive metadata remains in history.

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