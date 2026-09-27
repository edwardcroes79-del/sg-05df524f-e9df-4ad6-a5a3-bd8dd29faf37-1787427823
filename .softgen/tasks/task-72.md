---
title: Customer Reward Counts Display Fix
status: in_progress
priority: urgent
type: bug
tags: [customer-dashboard, rewards, expiration, data-accuracy]
created_by: agent
created_at: 2026-09-27T04:26:21Z
position: 72
---

## Notes
Fix the Customer Dashboard reward counting/display issue where total earned rewards can be shown as currently redeemable rewards. Available Rewards must include only earned, unredeemed, non-expired rewards for the authenticated customer. Expired rewards must be excluded from available counts, shown as expired in reward history, and remain in the historical total. Total Rewards Earned must remain historical and not decrease when rewards are redeemed or expired. Do not modify reward earning logic, redemption logic, expiration system, business settings, database RLS, or create duplicate reward records.

## Checklist
- [ ] Inspect customer dashboard reward summary and reward history rendering
- [ ] Inspect rewards schema/status/expiration fields and existing customer reward queries
- [ ] Identify whether the bug is query-side, status normalization, frontend counting, or stale data display
- [ ] Implement effective reward state calculation: available, redeemed, expired, total earned
- [ ] Update dashboard summary to show Available Rewards, Expired Rewards, and Total Rewards Earned from real records
- [ ] Ensure expired rewards remain visible in history with Expired status and are not redeemable
- [ ] Verify customer/business isolation and no mock/hard-coded reward counts
- [ ] Run targeted reward-count regression checks and project validation

## Acceptance
Customer dashboard shows available rewards separately from expired and total earned rewards.
Expired rewards are not counted as available or shown as redeemable.
Reward history clearly shows expired rewards without deleting or duplicating records.