---
title: Reward Expiration Creation Logic
status: in_progress
priority: high
type: feature
tags: [rewards, loyalty-programs, rpc]
created_by: agent
created_at: 2026-09-25T17:25:22Z
position: 39
---

## Notes
Implement Phase 3 only for Royalty Stamp reward expiration. Modify the existing reward-generation flow so newly earned rewards receive an `expires_at` value when the loyalty program has `reward_expiration_days` configured. Do not create a second reward-generation system. Do not modify customer reward UI, reward redemption, QR display, auth, billing, storage, or unrelated SaaS functionality. Existing rewards must remain unchanged; settings changes must affect future rewards only.

## Checklist
- [x] Inspect the live `issue_stamp_tx` reward creation implementation
- [x] Update only the existing reward creation logic to set `rewards.expires_at` during reward insert
- [x] Ensure `expires_at` is null when the program setting is null
- [x] Ensure configured expiration is calculated using trusted database time
- [x] Preserve duplicate prevention, transaction behavior, and staff/admin shared logic
- [ ] Verify actual database behavior for null and configured expiration cases without modifying existing rewards
- [ ] Run project validation

## Acceptance
Newly earned rewards store `expires_at = null` when the program has no expiration.
Newly earned rewards store an independent database-calculated `expires_at` when expiration days are configured.
Existing rewards are not backfilled or modified.