---
title: Super Admin Customer Deletion
status: done
priority: urgent
type: bug
tags: [admin, customers, auth, deletion]
created_by: agent
created_at: 2026-09-25T18:47:27Z
position: 43
---

## Notes
Investigated and fixed the Super Admin customer delete action. Root cause: `src/pages/admin/index.tsx` performed customer deletion directly in the browser with the anon Supabase client, ignored errors from related table/profile deletes, never deleted the Supabase Auth user, and showed success after only the final customer table delete did not return an error. Customer-owned tables identified from schema/FKs: `stamp_transactions` blocks customer deletion with NO ACTION, while `customer_loyalty_cards`, `rewards`, `reward_qr_tokens`, and `payment_transactions` are customer-scoped. Auth is involved through `customers.user_id`. Live schema verification confirmed `public.users` does not exist; customer profile data is in `profiles` and authentication data is in `auth.users`. Minimal fix: replace browser-side destructive deletes with `/api/admin/delete-customer`, a server-side Super Admin-only endpoint using the service-role key on the server. The endpoint validates the requester, validates the exact customer ID, blocks deletion if the Auth user is tied to business/staff/admin roles, deletes customer-owned rows in safe order, deletes the profile/Auth user when applicable, verifies backend removal, and only then returns success. Direct verification passed with a dedicated test customer and an unaffected control customer: target customer/profile/reward/card/Auth user were removed, control customer/profile remained unchanged, and project validation passed.

## Checklist
- [x] Identify the exact current delete flow from Super Admin UI to backend/database/Auth
- [x] Inspect customer-related tables, foreign keys, RLS policies, and Auth involvement
- [x] Determine why the UI can report success when deletion does not complete
- [x] Define the safest minimal deletion strategy for customer profile, Auth user, and customer-owned records
- [x] Implement only the necessary secure server-side fix
- [x] Verify backend deletion directly against database/Auth behavior
- [x] Confirm unrelated customer/business records remain unaffected
- [x] Run project validation

## Acceptance
Super Admin customer deletion only shows success after backend deletion succeeds.
Deleted customers no longer remain in customer/profile records or searchable customer lists.
Auth deletion is handled securely server-side when the customer is fully removed.
Unrelated business, loyalty program, stamp, reward, and customer data remains intact.