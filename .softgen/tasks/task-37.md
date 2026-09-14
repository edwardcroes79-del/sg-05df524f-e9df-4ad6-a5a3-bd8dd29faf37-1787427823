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
Investigate why customer-facing Loyalty Cards still do not show populated Loyalty Program description and reward instructions / expiration rules even though Business/Admin can see and edit them. User-provided screenshots show the Admin preview for the pizza card rendering "About This Program" and "Reward Instructions", while the customer-facing pizza card ends after "Target Reward". Live Supabase proof confirms pizza program `ca9cafa0-4883-4a04-b1d9-7d85943be98e` stores `description` = "With every purchase of one large pizza you will receive a stamp " and `reward_description` = "Valid for the purchase of on large Pizza"; customer card `74803154-8f43-4d87-8b21-32e7ad3c79ae` is tied to that same program. RLS is row-level and active program read is allowed. The customer wallet now explicitly selects the published fields and `LoyaltyCard` normalizes/renders them inside the existing card. No external duplicate details panel was reintroduced.

## Checklist
- [x] Verify current customer wallet code path passes program text props to `LoyaltyCard`
- [x] Verify current `LoyaltyCard` has internal rendering logic for both sections
- [x] Verify the exact pizza loyalty program database row and populated field names from the screenshots
- [x] Compare Admin preview prop mapping against Customer wallet prop mapping
- [x] Identify exact disappearance point: customer wallet query/mapping needed explicit published fields and card-level normalization
- [x] Apply the smallest customer-facing fix only
- [x] Validate no duplicate external section appears below the card
- [x] Run project error checks

## Acceptance
Customers can see About This Program inside the Loyalty Card when the business-configured program description is populated.
Customers can see Reward Instructions inside the Loyalty Card when the business-configured reward instructions / expiration rules are populated.
No duplicate details panel appears below the card and no unrelated systems are changed.