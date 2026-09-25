---
title: Reward Expiration Customer Display
status: in_progress
priority: high
type: feature
tags: [rewards, customer-ui, expiration]
created_by: agent
created_at: 2026-09-25T17:33:16Z
position: 40
---

## Notes
Implement Phase 4 only for Royalty Stamp reward expiration. Update the customer-facing loyalty card/reward display so customers can see if their reward expires, when it expires, or if it has already expired. 
Do not modify reward creation logic, QR generation, reward redemption, or business-facing functionality.

## Checklist
- [ ] Open and inspect `src/pages/customer/rewards.tsx`, `src/pages/customer/cards.tsx`, and `src/components/LoyaltyCard.tsx`
- [ ] Display "Expires: [date]" for rewards with future expiration
- [ ] Display "No expiration" for rewards with no expiration
- [ ] Display "⏰ Reward Expired" and disabled state for expired rewards
- [ ] Move expired rewards to history or appropriate section
- [ ] Validate UI on mobile/tablet/desktop
- [ ] Run project validation

## Acceptance
Customer sees clear expiration status for available rewards.
Expired rewards show the "Reward Expired" message and cannot be redeemed by the customer.
Existing business isolation and RLS are preserved.