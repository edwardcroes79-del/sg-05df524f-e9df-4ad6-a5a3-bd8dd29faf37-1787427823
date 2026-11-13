---
title: Unconfirmed auth user deletion
status: in_progress
priority: urgent
type: feature
tags: [superadmin, auth, security]
created_by: agent
created_at: 2026-11-13T18:24:29Z
position: 275
---

## Notes
Add a protected Superadmin-only delete action to the existing Unconfirmed Auth Users section. The feature must only allow deletion of genuinely unconfirmed customer accounts that have never successfully signed in and have no important loyalty or financial activity. The delete operation must run server-side with Supabase Admin API, preserve existing resend-confirmation behavior, protect privileged roles, and refresh the list after success. Audit logging is required for successful deletions. Scope is limited to this functionality only.

Implementation evidence so far:
- Current UI source is `src/pages/admin/index.tsx`.
- Current list endpoint is `src/pages/api/admin/unconfirmed-users.ts`.
- Current resend endpoint is `src/pages/api/admin/resend-confirmation.ts`.
- Superadmin guard and service-role client are centralized in `src/lib/server/adminAuth.ts`.
- Existing audit table is `public.audit_logs`.
- Live schema shows protected customer activity tables include `customer_loyalty_cards`, `stamp_transactions`, `rewards`, `reward_qr_tokens`, `payment_transactions`, `customer_birthdays`, `customer_birthday_corrections`, `birthday_reward_awards`, `anti_fraud_security_alerts`, and `anti_fraud_blocked_attempts`.

Rollback plan:
- Remove `src/pages/api/admin/delete-unconfirmed-user.ts`.
- Revert the Unconfirmed Auth Users UI changes in `src/pages/admin/index.tsx`.
- No database migration or RLS rollback is required because no schema or policy changes are planned.

## Checklist
- [x] Inspect the current Unconfirmed Auth Users UI, list endpoint, resend-confirmation flow, and Superadmin auth guard.
- [x] Inspect the live schema for customer-linked records, loyalty activity, and any existing audit/security tables relevant to safe deletion.
- [x] Add a secure Superadmin-only server-side delete endpoint that re-verifies account eligibility, blocks confirmed/signed-in/privileged/active accounts, safely cleans up orphaned records, deletes the Auth user, and records an audit trail.
- [x] Update the Superadmin Unconfirmed Auth Users table to add a visually distinct Delete User action with typed-email confirmation dialog and double-submit protection.
- [x] Refresh the list after successful deletion and preserve clear success/error notifications and existing resend-confirmation behavior.
- [ ] Validate that confirmed users, signed-in users, privileged accounts, and accounts with meaningful loyalty activity are protected.
- [ ] Run project error checks and document changed files, database changes, security details, test results, and limitations.

## Acceptance
A Superadmin can permanently delete an eligible unconfirmed customer account from the existing Unconfirmed Auth Users section only after typed-email confirmation.
Confirmed users, previously signed-in users, privileged accounts, and accounts with meaningful loyalty activity are blocked from deletion with clear server-validated errors.
After a successful deletion, the account disappears from the Unconfirmed Auth Users list and the resend-confirmation flow still works for remaining accounts.