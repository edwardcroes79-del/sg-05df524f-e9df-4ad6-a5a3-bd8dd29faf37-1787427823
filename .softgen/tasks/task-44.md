---
title: Reward Expiration Timestamp Verification
status: done
priority: high
type: chore
tags: [rewards, expiration, verification]
created_by: agent
created_at: 2026-09-26T16:45:41Z
position: 44
---

## Notes
Verified that Reward Expiration uses exact timestamps, not date-only logic. `rewards.expires_at` is stored as `timestamp with time zone`. The live `issue_stamp_tx` function calculates `v_reward_earned_at := now()` and then sets `v_reward_expires_at := v_reward_earned_at + make_interval(days => v_reward_expiration_days)`, preserving the exact earned time. The live `redeem_reward_tx` and `get_reward_by_qr_token` functions compare trusted database `now()` against `expires_at`. Customer UI formats the date for display only and does not control redemption validity. No code, database, RLS, reward logic, or redemption behavior changes were needed.

## Checklist
- [x] Inspect live database column type for `rewards.expires_at`
- [x] Inspect live reward creation RPC for timestamp calculation
- [x] Inspect live redemption RPCs for server-side timestamp comparison
- [x] Inspect customer UI only to confirm display does not drive redemption validity
- [x] Run validation if any implementation change is needed
- [x] Report exact verification result and stop

## Acceptance
Reward expiration is verified to use an exact timestamp.
Redemption is verified to compare trusted server/database time against `expires_at`.
No unrelated reward functionality is modified.