---
title: Unconfirmed auth user deletion
status: done
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

## Acceptance
The delete request sends the selected account’s real Supabase Auth user ID to the backend.
The backend keeps UUID validation and independent eligibility checks before deletion.
The Unconfirmed Auth Users list, typed-email dialog, and resend-confirmation action continue working normally.