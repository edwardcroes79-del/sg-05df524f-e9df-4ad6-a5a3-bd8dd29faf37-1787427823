---
title: Reward Expiration Final Verification
status: in_progress
priority: high
type: chore
tags: [rewards, regression, security]
created_by: agent
created_at: 2026-09-25T17:41:14Z
position: 42
---

## Notes
Final verification phase for Royalty Stamp reward expiration. Do not add features, redesign, or refactor. Verify the completed Phases 1-5 implementation using current code, live database schema/RLS, rollback-safe database tests, and project validation. If a reward-expiration-specific failure is found, fix only that issue.

## Checklist
- [ ] Inspect current reward expiration UI, creation RPC, redemption RPCs, and customer display code
- [ ] Verify live schema, RLS status, and reward/loyalty program fields
- [ ] Run rollback-safe database validation for no expiration, preset expirations, custom expiration, independent rewards, setting changes, existing rewards, redemption rejection, business isolation, and staff paths
- [ ] Run project validation
- [ ] Report verified results and any remaining issues

## Acceptance
Reward expiration is verified against actual database behavior and existing redemption flow.
No unrelated application behavior is modified during final verification.
Final report clearly distinguishes verified tests from anything not directly tested.