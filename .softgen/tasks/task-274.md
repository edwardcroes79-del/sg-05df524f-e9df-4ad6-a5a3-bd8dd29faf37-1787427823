---
title: Customer registration sync restoration
status: done
priority: urgent
type: bug
tags: [auth, customers, superadmin, recovery]
created_by: agent
created_at: 2026-11-12T17:13:55Z
position: 274
---

## Notes
Approved implementation scope: restore reliable Royalty Stamp customer registration synchronization, recover existing missing customer records safely, and verify Superadmin customer visibility. The read-only investigation found customer Auth users were being created without corresponding `public.customers` rows, and no database trigger was found that creates customer rows from Auth signup.

Exact root cause:
- The customer registration endpoint generated Supabase Auth signup links, but future registration synchronization was not guaranteed to create the linked `public.customers` record from the returned Auth user ID.
- Because Superadmin customer visibility depends on `public.customers`, Auth-only customer accounts could log in/confirm without appearing in the Superadmin Customers list.
- No database trigger/RPC was found that replaced this missing API-side synchronization.

Changes made:
- `src/pages/api/auth/register-customer.ts`
  - Normalizes email and name before signup.
  - Tags customer Auth signups with `registration_type: "customer"` and `role: "customer"`.
  - Creates one linked `public.customers` row using the returned Supabase Auth user ID.
  - Uses `onConflict: "user_id"` with duplicate-safe behavior so an existing customer row is not duplicated.
  - If customer-row creation fails, rolls back only the just-created Auth user and returns a safe error instead of leaving a new orphan account.
  - Sends the confirmation email to the normalized email address.
- Database data recovery:
  - Inserted missing `public.customers` rows for eligible confirmed customer Auth users only.
  - Excluded staff, owner, business-owner, and superadmin-related accounts.
  - Did not change schema, triggers, functions, RLS policies, auth configuration, Stamp Flow, or Quick Stamp.

Recovery and validation evidence:
- Missing eligible confirmed customer records identified for recovery: 26.
- Missing eligible confirmed customer records recovered: 26.
- Remaining eligible confirmed missing customers after recovery: 0.
- Duplicate `customers.user_id` rows after recovery: 0.
- Task-window recovered/created customer rows with non-customer roles: 0.
- Existing loyalty cards, stamps, rewards, transactions, and authentication credentials were not deleted, reset, or overwritten.
- Superadmin visibility input was verified through `public.customers` rows ordered by newest creation date.
- Build/type validation passed after the registration code change.
- A live browser registration/login test still requires a real Turnstile token and inbox confirmation; this was not simulated with fake credentials or weakened auth settings.

Rollback plan:
- Code rollback: revert `src/pages/api/auth/register-customer.ts` to the previous registration implementation.
- Data rollback, only if explicitly required: remove only the 26 rows inserted by the recovery query after first exporting their `user_id`, `name`, `email`, `phone`, and `created_at`; do not touch Auth users or loyalty tables.
- No schema objects, triggers, RLS policies, functions, or auth settings were changed, so there is no schema rollback.

## Checklist
- [x] Refresh schema and inspect customer/profile constraints, policies, triggers, and existing registration metadata
- [x] Update future customer registration synchronization so successful customer Auth accounts receive one correct `public.customers` row
- [x] Add duplicate-safe handling for existing customer rows by Auth user ID and eligible email
- [x] Create a reviewed backfill for confirmed missing customer accounts only, excluding non-customer roles
- [x] Verify Superadmin customer dashboard query/display after recovery
- [x] Validate registration code path, duplicate prevention, database recovery, non-customer exclusions, and build checks
- [x] Document exact root cause, changed files/database objects, recovery counts, duplicate status, and rollback plan

## Acceptance
- New customer registrations create exactly one linked `public.customers` row.
- Confirmed missing customer Auth users are recovered without modifying loyalty history or credentials.
- Superadmin Customers displays eligible new and recovered customers with correct identifying fields.
- Staff, owner, business-owner, and superadmin accounts are not inserted as customers.