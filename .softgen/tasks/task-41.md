---
title: Secure Reward Redemption Expiration
status: in_progress
priority: high
type: feature
tags: [rewards, redemption, security]
created_by: agent
created_at: 2026-09-25T17:36:33Z
position: 41
---

## Notes
Implement Phase 5 only for Royalty Stamp reward expiration. Update only the existing reward redemption flow so expired rewards cannot be redeemed. Inspect existing redemption RPC/functions first and reuse the current redemption architecture. Do not create duplicate redemption systems. Preserve RLS, business isolation, customer isolation, staff authorization, double-redemption protection, QR token behavior, and existing SaaS functionality. Do not modify customer UI except where required to show controlled expired-reward redemption errors in the existing Business/Staff redemption screens.

## Checklist
- [ ] Inspect existing reward redemption RPC/function bodies
- [ ] Identify every existing redemption path used by Business Admin or Staff
- [ ] Add trusted database-time expiration validation to existing redemption RPCs
- [ ] Ensure expired rewards return a clear controlled "Reward Expired" result
- [ ] Preserve atomic redemption and double-redemption/race-condition protection
- [ ] Update existing Business/Staff UI only if needed to display the controlled expired message
- [ ] Validate valid, expired, no-expiration, redeemed, wrong-business, unauthorized, and concurrent redemption behavior
- [ ] Run project validation

## Acceptance
Expired rewards cannot be redeemed through existing redemption paths.
Valid and no-expiration rewards still redeem through the existing architecture.
Rejected redemption attempts do not falsely show success and do not mutate reward status.