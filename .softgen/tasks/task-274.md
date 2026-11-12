---
title: Customer registration sync restoration
status: in_progress
priority: urgent
type: bug
tags: [auth, customers, superadmin, recovery]
created_by: agent
created_at: 2026-11-12T17:13:55Z
position: 274
---

## Notes
Approved implementation scope: restore reliable Royalty Stamp customer registration synchronization, recover existing missing customer records safely, and verify Superadmin customer visibility. The read-only investigation found customer Auth users were being created without corresponding `public.customers` rows, and no database trigger was found that creates customer rows from Auth signup.

Strict constraints preserved:
- Existing customer data, loyalty cards, stamps, rewards, transactions, and business relationships were not deleted, reset, or overwritten.
- Existing authentication credentials were not modified.
- RLS policies and unrelated permissions were not weakened.
- Stamp Flow and Quick Stamp were not modified.
- Staff, owner, business-owner, and superadmin accounts were excluded from the recovery.
- Duplicate prevention is enforced by `customers.user_id`; recovery and future sync use `on conflict (user_id) do nothing`.

Implementation evidence:
- Future sync was restored in `src/pages/api/auth/register-customer.ts` by tagging Supabase Auth signups with `registration_type: "customer"` and `role: "customer"`, then creating a linked `public.customers` row from the returned Auth user ID.
- Failed customer-row creation now returns an error and rolls back only the just-created Auth user, preventing a new orphan customer signup.
- Backfill inserted 26 confirmed eligible customer Auth users that were missing from `public.customers`.
- Post-backfill duplicate query returned no duplicate `customers.user_id` rows.
- Remaining confirmed Auth users without customer rows are business/staff/owner-related exclusions, not eligible customer records.
- Superadmin visibility input was verified by querying recovered `public.customers` rows ordered by newest creation date.

Rollback plan:
- Code rollback: revert `src/pages/api/auth/register-customer.ts` to the previous registration implementation.
- Data rollback, only if explicitly required: remove only the 26 rows inserted by the recovery query after first exporting their `user_id`, `name`, `email`, `phone`, and `created_at`; do not touch Auth users or loyalty tables.
- No schema objects, triggers, RLS policies, functions, or auth settings were changed.

## Checklist
- [x] Refresh schema and inspect customer/profile constraints, policies, triggers, and existing registration metadata
- [x] Update future customer registration synchronization so successful customer Auth accounts receive one correct `public.customers` row
- [x] Add duplicate-safe handling for existing customer rows by Auth user ID and eligible email
- [x] Create a reviewed backfill for confirmed missing customer accounts only, excluding non-customer roles
- [x] Verify Superadmin customer dashboard query/display after recovery
- [ ] Validate registration, login, duplicate registration, and non-customer exclusion behavior
- [x] Document exact root cause, changed files/database objects, recovery counts, duplicate status, and rollback plan

## Acceptance
- New customer registrations create exactly one linked `public.customers` row.
- Confirmed missing customer Auth users are recovered without modifying loyalty history or credentials.
- Superadmin Customers displays eligible new and recovered customers with correct identifying fields.
- Staff, owner, business-owner, and superadmin accounts are not inserted as customers.