---
title: Customer registration sync investigation
status: done
priority: high
type: bug
tags: [auth, customers, superadmin, investigation]
created_by: agent
created_at: 2026-11-12T17:13:55Z
position: 274
---

## Notes
Investigated why new Supabase Auth customer users are not appearing in the Royalty Stamp Superadmin Customers list. This was a read-only investigation. No source code, database records, RLS policies, migrations, auth settings, Stamp Flow, or Quick Stamp behavior were modified.

Root cause: customer registration creates Supabase Auth users but does not reliably create corresponding rows in `public.customers`, and there is no database trigger found that syncs Auth users into `public.customers`.

Evidence:
- `src/pages/api/auth/register-customer.ts` handles signup by calling `supabaseAdmin.auth.admin.generateLink({ type: "signup", email, password, options: { data: { full_name: name }, redirectTo } })`. It sends the confirmation email, but it does not insert into `public.customers` or `public.profiles`.
- `src/pages/admin/index.tsx` Superadmin Customers data loads from `supabase.from("customers").select("id, user_id, name, email, phone, avatar, created_at").order("created_at", { ascending: false }).limit(100)`. Therefore, Auth-only users cannot appear in that list unless a `public.customers` row exists.
- Database trigger inspection found only `public.profiles.ensure_super_admin_profile` for INSERT/UPDATE executing `handle_super_admin_assignment()`. No trigger was found on `auth.users`, `public.customers`, or `public.profiles` that creates customer rows from Auth signup.
- Auth/customer comparison found 53 customer-like Auth users with no `public.customers` row, including 26 confirmed Auth users.

Conclusion:
- Issue category: registration/synchronization.
- Not primarily a Superadmin display bug: the Superadmin customer list is querying the backend customer table as expected.
- Not primarily a permission/RLS bug for display: missing users are absent from `public.customers`, so there is nothing for the Superadmin list to display.
- Affected tables/routes/files: `auth.users`, `public.customers`, potentially `public.profiles`, `src/pages/api/auth/register-customer.ts`, `src/pages/auth/customer.tsx`, and the Superadmin Customers section in `src/pages/admin/index.tsx`.

Recommended fix:
1. Add an idempotent server-side customer sync path after email confirmation or at first customer login.
2. The sync should use Supabase-native Auth identity as the source of truth, create/update `public.profiles` with role `customer` only for real customer signups, and create `public.customers` with `user_id`, `email`, and `name`.
3. Keep staff/owner/superadmin accounts excluded from customer auto-provisioning to preserve the prior staff redirect fix.
4. Add a safe Superadmin recovery action or one-time admin script/RPC to backfill confirmed customer-like Auth users missing `public.customers` rows after reviewing classification rules.
5. Keep registration idempotent: if a customer row already exists for `user_id` or email, do not create duplicates.

Safe recovery plan:
1. Export a review list of the 53 missing customer-like Auth users split by confirmed/unconfirmed status.
2. Backfill only confirmed customer signups that are not staff, owner, business owner, or superadmin.
3. Use `auth.users.id` as `customers.user_id`; use Auth email and `raw_user_meta_data.full_name` for `email` and `name` when present.
4. Leave unconfirmed users out of `public.customers` unless the product decision is to show pending customers in Superadmin.
5. After backfill, verify Superadmin global customer count and Customers tab count increase by the approved backfilled number.

## Checklist
- [x] Trace customer registration flow and record creation path
- [x] Inspect Superadmin Customers data loading query
- [x] Compare auth.users against public customers/profiles rows
- [x] Check for missing profile/customer rows and permission/display filters
- [x] Identify exact root cause and affected tables/routes/files
- [x] Provide recommended fix and safe recovery plan without implementation

## Acceptance
- Exact cause of missing customers is documented with evidence.
- Count of Auth users missing from backend customer list is reported.
- No code or database changes are made beyond this investigation task note.