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
Investigate why customer-facing Loyalty Cards still do not show populated Loyalty Program description and reward instructions / expiration rules even though Business/Admin can see and edit them. The root cause was finally identified as a CSS rendering bug inside `LoyaltyCard.tsx`. When a business uploaded a custom banner, the banner occupied vertical space inside the `Card`. Because the `CardContent` had `h-full flex flex-col justify-between`, and the parent `Card` had `overflow-hidden` without a fixed height, the remaining text content was stretched exactly past the visible boundary and clipped entirely off-screen on the customer's view. Removed `h-full` and `justify-between` from `CardContent` so the card naturally expands to fit all its children safely.

## Checklist
- [x] Verify current customer wallet code path passes program text props to `LoyaltyCard`
- [x] Verify current `LoyaltyCard` has internal rendering logic for both sections
- [x] Verify the exact pizza loyalty program database row and populated field names from the screenshots
- [x] Compare Admin preview prop mapping against Customer wallet prop mapping
- [x] Identify exact disappearance point: CSS flexbox clipping bug when `bannerUrl` forces content down
- [x] Apply the smallest customer-facing fix only
- [x] Validate no duplicate external section appears below the card
- [x] Run project error checks

## Acceptance
Customers can see About This Program inside the Loyalty Card when the business-configured program description is populated.
Customers can see Reward Instructions inside the Loyalty Card when the business-configured reward instructions / expiration rules are populated.
No duplicate details panel appears below the card and no unrelated systems are changed.