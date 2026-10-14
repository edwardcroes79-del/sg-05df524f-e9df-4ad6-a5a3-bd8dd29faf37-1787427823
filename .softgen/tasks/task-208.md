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
Urgent production bug: staff search on Stamps & Rewards fails because Supabase cannot choose between overloaded `public.search_business_customers(p_business_id uuid, p_search text, p_limit integer)` and `public.search_business_customers(p_business_id uuid, p_search text, p_limit integer, p_loyalty_program_id uuid)`. Inspect migrations, live function definitions, RPC calls, and customer-search code before changing anything. Intended behavior from the recent reconciliation fix is selected-loyalty-program filtering plus business isolation. Use the smallest safe correction. Do not delete customer records, weaken authorization, modify anti-fraud/cooldown logic, or deploy automatically.

## Checklist
- [ ] Inspect live `search_business_customers` function definitions and overloads
- [ ] Inspect migrations that created or replaced the function
- [ ] Inspect all application RPC call sites and confirm intended signature
- [ ] Verify business/program authorization and selected-program filtering are preserved
- [ ] Apply smallest safe correction with reviewed migration if needed
- [ ] Test customer search by name, email, and phone through the intended RPC signature
- [ ] Test Owner and Staff permission behavior without changing other stamping methods
- [ ] Run project validation and report remaining deployment steps

## Acceptance
Customer search calls resolve unambiguously to the selected-program-scoped function. Results include only active memberships in the selected business and selected loyalty program. Owner and Staff authorization rules remain enforced, and other stamping methods continue unchanged.