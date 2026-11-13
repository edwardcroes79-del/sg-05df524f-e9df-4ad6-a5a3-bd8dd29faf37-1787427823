---
title: Unconfirmed auth user deletion
status: in_progress
priority: urgent
type: bug
tags: [superadmin, auth, security]
created_by: agent
created_at: 2026-11-13T18:24:29Z
position: 275
---

## Notes
Follow-up bug: the Superadmin Delete Unconfirmed Account dialog accepted typed-email confirmation, but the delete endpoint returned "A valid target user ID is required." The backend correctly required a UUID. The root cause was an ID-field mapping risk between the unconfirmed-users API response and the admin UI delete payload: the UI depended on `user.id`, while the deletion flow needed an explicit, preserved Supabase Auth user ID.

Fix applied:
- `src/pages/api/admin/unconfirmed-users.ts` now returns explicit Auth ID aliases: `id`, `auth_user_id`, and `user_id`, all set from the Supabase Auth user ID.
- `src/pages/admin/index.tsx` now normalizes the selected account ID through `getUnconfirmedAuthUserId(user)` and sends that normalized ID as `userId` to `/api/admin/delete-unconfirmed-user`.
- Email remains confirmation-only and is not used as a substitute for the Auth user ID.
- `src/pages/api/admin/delete-unconfirmed-user.ts` keeps UUID validation and all server-side eligibility checks.

Security preserved:
- Superadmin-only server guard remains in place.
- Backend UUID validation remains in place.
- Backend still independently loads the target Auth user before deletion.
- Backend still blocks confirmed users, users with sign-in history, privileged/business/staff accounts, and accounts with meaningful loyalty/payment/reward/activity records.
- Supabase service-role key remains server-only.
- No customer registration, email confirmation, resend-confirmation behavior, Stamp Flow, Quick Stamp, loyalty tables, RLS, triggers, or auth settings were modified.

Validation:
- Project check passed after the fix: no CSS, linting, type checking, or server errors found.
- No destructive live deletion was performed without a dedicated disposable test account.

## Checklist
- [x] Reopen task evidence and convert this task back to in-progress for the bug fix.
- [x] Inspect how unconfirmed Auth users are retrieved and which ID field is returned.
- [x] Inspect how the Superadmin UI stores the unconfirmed user ID and submits the delete request.
- [x] Inspect how the delete endpoint validates and uses the target Auth user ID.
- [x] Fix the root ID field mismatch without weakening security checks.
- [x] Validate TypeScript/lint/build checks.
- [x] Document the exact root cause, files changed, backend security status, and test results.
- [ ] Recurring bug: trace request parsing and UUID validator line-by-line against real Auth UUIDs of the 4 authorized test accounts
- [ ] Fix the actual root cause (no validation removal, no email-as-ID substitution)
- [ ] Verify eligibility of jecifi7859@art2mart.com, rozenberg.rayveline@gmail.con, ls-ras@hormaim.comcom, ruxandrawever@hotmail.com
- [ ] Delete only eligible authorized accounts via Supabase Admin API and confirm removal from auth.users
- [ ] Confirm audit log entries, no loyalty data touched, checks pass
- [x] Extension: map every table referencing businesses (FKs) to build Business dependency checks
- [x] Extension: allow General/Business types server-side with type-specific eligibility (still blocks admin/staff/privileged)
- [x] Extension: Business deletion only for unused incomplete registrations (no programs, cards, staff, customers, stamps, rewards, subscriptions, payments); explicit non-cascading cleanup of the empty business row only
- [x] Extension: show account type in confirmation dialog
- [ ] Extension: test per category (Customer, General, Business) and report blocked accounts with reasons

## Acceptance
The delete request sends the selected account’s real Supabase Auth user ID to the backend.
The backend keeps UUID validation and independent eligibility checks before deletion.
The Unconfirmed Auth Users list, typed-email dialog, and resend-confirmation action continue working normally.