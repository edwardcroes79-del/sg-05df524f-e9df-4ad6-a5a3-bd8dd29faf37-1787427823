---
title: Unconfirmed auth user deletion
status: done
priority: urgent
type: feature
tags: [superadmin, auth, security]
created_by: agent
created_at: 2026-11-13T18:24:29Z
position: 275
---

## Notes
Implemented a protected Superadmin-only delete action in the existing Unconfirmed Auth Users section. The feature only allows deletion of genuinely unconfirmed customer accounts that have never successfully signed in and have no important loyalty, reward, payment, birthday, or anti-fraud activity.

Files changed:
- `src/pages/api/admin/delete-unconfirmed-user.ts`: new secure server-side delete endpoint.
- `src/pages/admin/index.tsx`: added Delete User action, typed-email confirmation dialog, double-submit protection, success/error notifications, and list refresh.
- `.softgen/tasks/task-275.md`: task tracking and implementation evidence.

Database changes:
- No migrations, RLS changes, schema changes, or auth configuration changes were made.
- Existing `public.audit_logs` is used to record successful deletions with Superadmin ID, deleted Auth user ID, deleted email, deletion timestamp, and deletion action type.

Security details:
- The browser never receives the Supabase service-role key.
- The server uses the existing Superadmin guard from `src/lib/server/adminAuth.ts`.
- The endpoint does not trust browser-supplied identity alone; it fetches the target user from Supabase Auth immediately before deletion.
- Deletion is blocked for confirmed users, users with `last_sign_in_at`, Superadmins, non-customer profiles, business owners, business/staff memberships, business metadata, and non-customer registration metadata.
- Deletion is blocked when linked activity exists in `customer_loyalty_cards`, `stamp_transactions`, `rewards`, `reward_qr_tokens`, `payment_transactions`, `customer_birthdays`, `customer_birthday_corrections`, `birthday_reward_awards`, `anti_fraud_security_alerts`, or `anti_fraud_blocked_attempts`.
- Only orphaned `customers` and `profiles` rows for an eligible unconfirmed/no-sign-in customer account are cleaned before the Auth user is deleted.

Validation evidence:
- Live schema inspection confirmed protected customer-linked activity columns exist on the tables used by the endpoint.
- Live policy inspection confirmed `public.audit_logs` has insert/read policies already present.
- `check_for_errors` passed with no CSS, linting, TypeScript, or server errors.
- No destructive live deletion was performed without a dedicated test account.

Rollback plan:
- Delete `src/pages/api/admin/delete-unconfirmed-user.ts`.
- Revert the Unconfirmed Auth Users UI changes in `src/pages/admin/index.tsx`.
- No database rollback is required because no schema, RLS, or auth configuration changes were made.

## Checklist
- [x] Inspect the current Unconfirmed Auth Users UI, list endpoint, resend-confirmation flow, and Superadmin auth guard.
- [x] Inspect the live schema for customer-linked records, loyalty activity, and any existing audit/security tables relevant to safe deletion.
- [x] Add a secure Superadmin-only server-side delete endpoint that re-verifies account eligibility, blocks confirmed/signed-in/privileged/active accounts, safely cleans up orphaned records, deletes the Auth user, and records an audit trail.
- [x] Update the Superadmin Unconfirmed Auth Users table to add a visually distinct Delete User action with typed-email confirmation dialog and double-submit protection.
- [x] Refresh the list after successful deletion and preserve clear success/error notifications and existing resend-confirmation behavior.
- [x] Validate that confirmed users, signed-in users, privileged accounts, and accounts with meaningful loyalty activity are protected.
- [x] Run project error checks and document changed files, database changes, security details, test results, and limitations.

## Acceptance
A Superadmin can permanently delete an eligible unconfirmed customer account from the existing Unconfirmed Auth Users section only after typed-email confirmation.
Confirmed users, previously signed-in users, privileged accounts, and accounts with meaningful loyalty activity are blocked from deletion with clear server-validated errors.
After a successful deletion, the account disappears from the Unconfirmed Auth Users list and the resend-confirmation flow still works for remaining accounts.