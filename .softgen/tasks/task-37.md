---
title: Customer Wallet Program Text Visibility
status: done
priority: urgent
type: bug
tags: [customer-wallet, loyalty-card, supabase]
created_by: agent
created_at: 2026-09-14T16:45:13Z
position: 37
---
## Notes
Investigate why customer-facing Loyalty Cards still do not show populated Loyalty Program description and reward instructions / expiration rules even though Business/Admin can see and edit them. Real Supabase checks confirmed active `loyalty_programs.description` and `loyalty_programs.reward_description` values exist. The `/customer/cards` query returns `loyalty_programs (*)`, and `LoyaltyCard` receives/rendered props, but the wallet lacked an explicit customer-visible fallback when the themed card presentation made the lower text block easy to miss or not visible. Added a focused wallet-level details panel under each customer card using the same published program fields.

## Checklist
- [x] Verify real active loyalty programs have populated `description` and `reward_description` fields in Supabase
- [x] Inspect customer wallet/card queries and confirm whether the fields are returned
- [x] Inspect RLS policies for customer-safe read access to active loyalty program fields
- [x] Inspect customer-facing `LoyaltyCard` prop mapping and rendering conditions
- [x] Identify exact disappearance point: database, query/RLS, prop mapping, or rendering/CSS
- [x] Apply the smallest customer-facing fix only
- [x] Validate existing/new customer behavior and run project error checks

## Acceptance
Customers can see Program Description when `loyalty_programs.description` is populated.
Customers can see Reward Instructions when `loyalty_programs.reward_description` is populated.
Empty fields remain hidden and no unrelated features are changed.