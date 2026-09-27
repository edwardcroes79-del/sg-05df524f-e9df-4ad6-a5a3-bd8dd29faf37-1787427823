---
title: Customer Reward Counts Display Fix
status: done
priority: urgent
type: bug
tags: [customer-dashboard, rewards, expiration, data-accuracy]
created_by: agent
created_at: 2026-09-27T04:26:21Z
position: 72
---

## Notes
Fixed the Customer Dashboard reward counting/display issue where total earned rewards could be shown as currently redeemable rewards. Available Rewards now include only authenticated customer rewards with `status = available` and no expired `expires_at` timestamp. Expired rewards are excluded from available counts, remain visible in reward history with an Expired status, and continue to count toward Total Rewards Earned. Total Rewards Earned remains historical and does not decrease when rewards are redeemed or expired. No reward earning logic, redemption logic, expiration system, business settings, database RLS, or duplicate reward records were changed. Targeted regression checks confirmed 3 available / 1 expired / 4 total, then 2 available / 1 expired / 1 redeemed / 4 total after redemption, then 1 available / 2 expired / 1 redeemed / 4 total after another expiration. Project validation passed.

## Checklist
- [x] Inspect customer dashboard reward summary and reward history rendering
- [x] Inspect rewards schema/status/expiration fields and existing customer reward queries
- [x] Identify whether the bug is query-side, status normalization, frontend counting, or stale data display
- [x] Implement effective reward state calculation: available, redeemed, expired, total earned
- [x] Update dashboard summary to show Available Rewards, Expired Rewards, and Total Rewards Earned from real records
- [x] Ensure expired rewards remain visible in history with Expired status and are not redeemable
- [x] Verify customer/business isolation and no mock/hard-coded reward counts
- [x] Run targeted reward-count regression checks and project validation

## Acceptance
Customer dashboard shows available rewards separately from expired and total earned rewards.
Expired rewards are not counted as available or shown as redeemable.
Reward history clearly shows expired rewards without deleting or duplicating records.