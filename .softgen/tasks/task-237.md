---
title: Birthday Rewards Stage B1 Award Function
status: in_progress
priority: urgent
type: feature
tags: [birthday-rewards, stage-b, migration, rpc]
created_by: agent
created_at: 2026-10-26T02:50:48Z
position: 237
---

## Notes
Implement Stage B1 only for Royalty Stamp Birthday Rewards. Stage A is already applied in production project bmpiuvpnefobspimkyte and must not be repeated. The current Stage B1 draft must be revised only, not applied. Review PostgreSQL exception-block rollback behavior, compare card/reward logic against issue_stamp_core_tx, prevent failed attempts from permanently blocking retry, keep p_award_date restricted to service-role execution, and re-run read-only dependency/constraint validation before reporting a revised checksum.

## Checklist
- [x] Confirm production schema, Stage A objects, helper functions, stamp/reward/card tables, constraints, indexes, policies, and grants with read-only inspection
- [x] Draft a new Stage B migration for the birthday award RPC and supporting eligibility index only
- [x] Preserve existing stamp issuance, Quick Stamp QR, anti-fraud checks, reward redemption, analytics definitions, and public RPC signatures
- [ ] Inspect issue_stamp_core_tx, reward creation, card columns, constraints, triggers, and function permissions with read-only database queries
- [ ] Revise the Stage B1 migration draft for retry-safe transaction behavior and card/reward compatibility
- [ ] Recalculate revised migration checksum and report complete SQL, rollback SQL, test evidence, blockers, and approval requirement

## Acceptance
Stage B1 produces a reviewed migration draft only; no migration is applied and production behavior remains unchanged.