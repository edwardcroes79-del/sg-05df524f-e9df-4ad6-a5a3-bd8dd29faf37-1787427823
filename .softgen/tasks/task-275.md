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
Root cause of "A valid target user ID is required": the UUID regex in src/pages/api/admin/delete-unconfirmed-user.ts was malformed (8-4-4-13, missing the fourth group and hyphen), so every real Supabase UUID was rejected. The earlier alias fix (auth_user_id/user_id) did not touch the regex. Fixed to strict RFC 4122 8-4-4-4-12; verified against the 4 real UUIDs (old=false, new=true).

Extension to General and Business accounts:
- New src/lib/server/unconfirmedUserEligibility.ts classifies server-side (business > customer > general) and blocks: Super Admin, non-allowlisted roles/registration types, staff memberships in other businesses, approved/active owned businesses, and any row in 20 user-reference columns, 10 customer-activity tables, 20 business-referencing tables, or other business_users members.
- Endpoint removes an empty owned business only after all dependency counts are zero; owner membership is deleted explicitly first so cascades have nothing to remove.
- Audit log now records account_type and rows removed.
- Dialog shows account type.
- No migrations, RLS, trigger, registration, confirmation, resend, Stamp Flow, or Quick Stamp changes.

Test results:
- Customer: 4 authorized accounts deleted via UI; 0 remain in auth.users; 1 audit entry each.
- Business (marilyndecuba01@gmail.com) and 6 General accounts: read-only pre-check shows zero dependencies; awaiting UI deletion by Superadmin.
- Unauthenticated / invalid-token requests return 401.
- TypeScript and ESLint clean on changed files; full lint run is OOM-killed by sandbox (pre-existing).

Rollback: revert the three code files; no database objects were changed.

## Checklist
- [x] Trace ID flow from list API to Admin API delete
- [x] Fix malformed UUID regex without weakening validation
- [x] Verify eligibility of the 4 authorized customer test accounts
- [x] Delete eligible customer test accounts and confirm removal from auth.users with audit entries
- [x] Map every table referencing businesses and auth.users for dependency checks
- [x] Allow General/Business types server-side with type-specific eligibility
- [x] Non-cascading cleanup of empty business registrations only
- [x] Show account type in confirmation dialog
- [ ] Verify Business and General deletions via UI and confirm removal in Supabase

## Acceptance
- Eligible Customer, General, and Business unconfirmed accounts can be deleted by a Superadmin and disappear from Supabase Auth and the list.
- Accounts with privileged roles, staff links, or loyalty/business data are blocked with a clear reason.
- Resend confirmation and all protected flows continue working.