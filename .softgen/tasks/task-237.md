---
title: Birthday Rewards Stage B1 Award Function
status: done
priority: urgent
type: feature
tags: [birthday-rewards, stage-b, migration, rpc]
created_by: agent
created_at: 2026-10-26T02:50:48Z
position: 237
---

## Notes
Implement Stage B1 only for Royalty Stamp Birthday Rewards. Stage A is already applied in production project bmpiuvpnefobspimkyte and must not be repeated. Draft a new migration for the dedicated transactional birthday-award function using stamp_type birthday_bonus, oldest eligible active card selection, America/Aruba processing, leap-day rules, earned-only eligibility, and one award per customer/business/year. Do not apply the migration, run production award batches, deploy, activate Birthday Rewards, configure cron, or send notifications. Before any migration application, report complete SQL, checksum, affected objects, and rollback limitations.

## Checklist
- [x] Confirm production schema, Stage A objects, helper functions, stamp/reward/card tables, constraints, indexes, policies, and grants with read-only inspection
- [x] Draft a new Stage B migration for the birthday award RPC and supporting eligibility index only
- [x] Preserve existing stamp issuance, Quick Stamp QR, anti-fraud checks, reward redemption, analytics definitions, and public RPC signatures
- [x] Verify transaction safety for award ledger, stamp transaction, card count, and reward creation consistency
- [x] Calculate migration checksum and report SQL, affected objects, rollback limitations, unresolved risks, and approval needed before application

## Acceptance
Stage B1 produces a reviewed migration draft only; no migration is applied and production behavior remains unchanged.