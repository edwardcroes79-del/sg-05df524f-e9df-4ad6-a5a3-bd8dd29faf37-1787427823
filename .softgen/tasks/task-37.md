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
Investigate why customer-facing Loyalty Cards still do not show populated Loyalty Program description and reward instructions / expiration rules even though Business/Admin can see and edit them. User-provided screenshots show the Admin preview for the pizza card rendering "About This Program" and "Reward Instructions", while the customer-facing pizza card ends after "Target Reward". Current open code shows `LoyaltyCard.tsx` has conditional rendering for `programDescription` and `rewardDescription`, and `/customer/cards` attempts to pass `loyalty_programs.description` and `loyalty_programs.reward_description`. The active investigation must prove whether the real pizza program stores those values in these columns, whether the customer query returns them, whether the props are empty, or whether a different customer-facing component/path is being used.

## Checklist
- [x] Verify current customer wallet code path passes program text props to `LoyaltyCard`
- [x] Verify current `LoyaltyCard` has internal rendering logic for both sections
- [ ] Verify the exact pizza loyalty program database row and populated field names from the screenshots
- [ ] Compare Admin preview prop mapping against Customer wallet prop mapping
- [ ] Identify exact disappearance point: database, query/RLS, prop mapping, different component, or CSS/layout
- [ ] Apply the smallest customer-facing fix only
- [ ] Validate no duplicate external section appears below the card
- [ ] Run project error checks

## Acceptance
Customers can see About This Program inside the Loyalty Card when the business-configured program description is populated.
Customers can see Reward Instructions inside the Loyalty Card when the business-configured reward instructions / expiration rules are populated.
No duplicate details panel appears below the card and no unrelated systems are changed.