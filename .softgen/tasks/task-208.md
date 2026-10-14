---
title: Search Business Customers RPC Ambiguity
status: in_progress
priority: urgent
type: bug
tags: [stamping, rpc, customers, production]
created_by: agent
created_at: 2026-10-14T20:32:11Z
position: 208
---

## Notes
Urgent production bug: staff search on Stamps & Rewards fails because Supabase cannot choose between overloaded `public.search_business_customers(p_business_id uuid, p_search text, p_limit integer)` and `public.search_business_customers(p_business_id uuid, p_search text, p_limit integer, p_loyalty_program_id uuid)`. Inspection confirmed both overloads exist because the earlier staff-permission migration created the 3-parameter business-wide search function, then the reconciliation fix introduced the intended 4-parameter selected-program-scoped function. The application call in `src/pages/dashboard/scan.tsx` is intended to use the 4-parameter signature with `p_loyalty_program_id` so results remain scoped to active memberships in the selected business and selected loyalty program. A reviewed migration file was created at `supabase/migrations/20261014203500_resolve_search_business_customers_overload.sql` containing only `DROP FUNCTION IF EXISTS public.search_business_customers(uuid, text, integer);`. Applying it is pending explicit confirmation because the database tool classifies `DROP FUNCTION` as destructive. No customer records, memberships, stamps, rewards, transaction history, anti-fraud settings, cooldown logic, or deployment were changed.

## Checklist
- [x] Inspect live `search_business_customers` function definitions and overloads
- [x] Inspect migrations that created or replaced the function
- [x] Inspect all application RPC call sites and confirm intended signature
- [x] Verify business/program authorization and selected-program filtering are preserved
- [ ] Apply smallest safe correction with reviewed migration if confirmed
- [ ] Test customer search by name, email, and phone through the intended RPC signature
- [ ] Test Owner and Staff permission behavior without changing other stamping methods
- [x] Run project validation and report remaining deployment steps

## Acceptance
Customer search calls resolve unambiguously to the selected-program-scoped function. Results include only active memberships in the selected business and selected loyalty program. Owner and Staff authorization rules remain enforced, and other stamping methods continue unchanged.