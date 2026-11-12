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

Strict constraints:
- Preserve all existing customer data, loyalty cards, stamps, rewards, transactions, and business relationships.
- Do not delete, recreate, reset, or overwrite existing customer accounts or authentication credentials.
- Do not weaken RLS policies or unrelated permissions.
- Do not modify Stamp Flow or Quick Stamp.
- Do not assume every `auth.users` row is a customer; exclude staff, owner, business-owner, and superadmin accounts.
- Keep the fix idempotent and duplicate-safe by `customers.user_id` and eligible email matching.

Implementation approach:
- Inspect current `public.customers`, `public.profiles`, relevant constraints, policies, triggers, and Auth metadata patterns before writing SQL.
- Restore future sync through the customer registration/login path using Supabase Auth user ID as source of truth and safe server-side customer-row creation only for customer registrations.
- Backfill genuinely missing confirmed customer Auth accounts with no existing customer row while preserving existing records.
- Verify the Superadmin Customers page reads fresh rows and displays recovered/new customers without stale-cache dependence.
- Provide rollback details for every database object or file changed.

## Checklist
- [ ] Refresh schema and inspect customer/profile constraints, policies, triggers, and existing registration metadata
- [ ] Update future customer registration synchronization so successful customer Auth accounts receive one correct `public.customers` row
- [ ] Add duplicate-safe handling for existing customer rows by Auth user ID and eligible email
- [ ] Create a reviewed backfill for confirmed missing customer accounts only, excluding non-customer roles
- [ ] Verify Superadmin customer dashboard query/display after recovery
- [ ] Validate registration, login, duplicate registration, and non-customer exclusion behavior
- [ ] Document exact root cause, changed files/database objects, recovery counts, duplicate status, and rollback plan

## Acceptance
- New customer registrations create exactly one linked `public.customers` row.
- Confirmed missing customer Auth users are recovered without modifying loyalty history or credentials.
- Superadmin Customers displays eligible new and recovered customers with correct identifying fields.
- Staff, owner, business-owner, and superadmin accounts are not inserted as customers.