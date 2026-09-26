---
title: Reward Expiration Timestamp Verification
status: in_progress
priority: high
type: chore
tags: [rewards, expiration, verification]
created_by: agent
created_at: 2026-09-26T16:45:41Z
position: 44
---

## Notes
Verify that Reward Expiration uses exact timestamps, not date-only logic. Confirm `rewards.expires_at` stores an exact timestamp, reward creation calculates expiration with trusted database/server time, and redemption compares trusted current database time against `expires_at`. If the current implementation already works this way, make no code changes. If date-only logic exists, correct only expiration calculation/storage/redemption logic.

## Checklist
- [ ] Inspect live database column type for `rewards.expires_at`
- [ ] Inspect live reward creation RPC for timestamp calculation
- [ ] Inspect live redemption RPCs for server-side timestamp comparison
- [ ] Inspect customer UI only to confirm display does not drive redemption validity
- [ ] Run validation if any implementation change is needed
- [ ] Report exact verification result and stop

## Acceptance
Reward expiration is verified to use an exact timestamp.
Redemption is verified to compare trusted server/database time against `expires_at`.
No unrelated reward functionality is modified.