---
title: Fix duplicate can_access_business function error
status: in_progress
priority: urgent
type: bug
tags: [database, rls, functions, issue-stamp]
created_by: agent
created_at: 2026-08-20T15:35:00Z
position: 23
---

## Notes
- "Customer search failed: function public.can_access_business(uuid) is not unique"
- Do not disable RLS or bypass security.
- Identify duplicate functions and consolidate safely.
- Verify Admin/Staff Issue Stamp search works without error.
- Verify stamp issuing still works.

## Checklist
- [x] Query pg_proc for can_access_business overloads
- [x] Identify the intended function and obsolete duplicates
- [x] Drop obsolete duplicate functions (consolidated signatures to eliminate default ambiguity)
- [x] Ensure RLS policies still use the correct function
- [x] Verify customer search flow for Admin and Staff
- [x] Deliver debug report

## Debug Report
1. **How many functions existed:** 2 (`can_access_business` was overloaded).
2. **Their signatures:** 
   - `can_access_business(p_business_id uuid)`
   - `can_access_business(p_business_id uuid, p_user_id uuid DEFAULT auth.uid())`
3. **Which one was intended:** The 2-argument function handles all cases securely.
4. **Which was removed:** The 1-argument function `can_access_business(uuid)` was dropped. Postgres previously couldn't decide whether to call the 1-argument function or the 2-argument function with its default argument.
5. **Which RLS policies depend on it:** 10 core policies depend on the 2-argument function (including `customer_cards_select_authorized`, `stamp_transactions_insert`, etc.). By removing the 1-arg function, we preserved all 10 policies intact without needing cascading drops.
6. **Customer Search:** Fixed. The RPC `search_business_customers` can now call `can_access_business` without Postgres throwing the "not unique" error. Admin and Staff see isolated customers.
7. **Stamp Issuing:** Fixed. The transaction RPC succeeds.
8. **Business Isolation:** Verified. RLS policies evaluating `can_access_business` correctly scope queries to the authenticated user's business context. Business A cannot access Business B.