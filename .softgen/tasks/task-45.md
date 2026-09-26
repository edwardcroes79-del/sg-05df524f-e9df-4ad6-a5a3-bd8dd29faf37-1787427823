---
title: Customer Reward Countdown
status: done
priority: high
type: feature
tags: [rewards, customer-ui, countdown]
created_by: agent
created_at: 2026-09-26T16:58:00Z
position: 45
---

## Notes
Update the Customer Loyalty Card reward display to clearly show how much time is remaining before a reward expires.
Replace static expiration dates with an active, auto-updating countdown.
- Do not modify database, reward logic, or redemption security.
- Countdown uses exact timestamp (`expires_at`), not device clock for actual validity.
- Countdown is visual only. Redemptions still undergo server-side validation.
- Format scales gracefully: Days/Hours -> Hours/Minutes -> Minutes -> "Less than 1 minute".
- Expired and "No expiration" states remain supported.

## Checklist
- [x] Inspect existing `src/pages/customer/rewards.tsx` and `src/pages/customer/cards.tsx`.
- [x] Implement a lightweight local state/effect for countdown formatting without database polling.
- [x] Update `rewards.tsx` to display countdown for active rewards.
- [x] Update `cards.tsx` to display countdown in unlocked reward modal/display.
- [x] Ensure formatting matches requirements without layout shift or horizontal scroll.
- [x] Validate on desktop and mobile viewports.
- [x] Run project validation.

## Acceptance
Active rewards show an auto-updating countdown based on their `expires_at` timestamp.
Expired rewards show "⏰ Reward Expired".
Rewards with no expiration show "♾️ No expiration".
Server remains the authority on actual validity.