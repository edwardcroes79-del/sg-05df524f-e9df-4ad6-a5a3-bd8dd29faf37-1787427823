---
title: Customer Wallet Program Text Visibility
status: in_progress
priority: urgent
type: bug
tags: [customer-wallet, loyalty-card, supabase]
created_by: agent
created_at: 2026-09-14T16:45:13Z
position: 37
---
## Notes
Investigate why customer-facing Loyalty Cards still do not show populated Loyalty Program description and reward instructions / expiration rules even though Business/Admin can see and edit them. Trace the exact flow from `loyalty_programs` storage through the customer wallet queries and the `LoyaltyCard` component before changing code. Do not modify unrelated systems or redesign the card.

## Checklist
- [ ] Verify real active loyalty programs have populated `description` and `reward_description` fields in Supabase
- [ ] Inspect customer wallet/card queries and confirm whether the fields are returned
- [ ] Inspect RLS policies for customer-safe read access to active loyalty program fields
- [ ] Inspect customer-facing `LoyaltyCard` prop mapping and rendering conditions
- [ ] Identify exact disappearance point: database, query/RLS, prop mapping, or rendering/CSS
- [ ] Apply the smallest customer-facing fix only
- [ ] Validate existing/new customer behavior and run project error checks

## Acceptance
Customers can see Program Description when `loyalty_programs.description` is populated.
Customers can see Reward Instructions when `loyalty_programs.reward_description` is populated.
Empty fields remain hidden and no unrelated features are changed.