---
title: Birthday Rewards Stage A Schema
status: done
priority: urgent
type: feature
tags: [birthday-rewards, schema, security]
created_by: agent
created_at: 2026-10-24T21:56:48Z
position: 235
---

## Notes
Stage A is approved for migration draft only. Do not execute database changes yet. The migration must be additive and define Birthday Rewards storage, business opt-in settings, award ledger protection, customer notification preference, date validation, RLS, indexes, and safe defaults. Production cron, notification sending, award issuance, and feature activation remain disabled.

## Checklist
- [x] Draft additive Stage A migration for birthday storage, notification preferences, business settings, and award ledger
- [x] Keep birthdays private from business users by default
- [x] Enforce one award per customer, business, and birthday year
- [x] Default business Birthday Rewards disabled and customer birthday notifications enabled
- [x] Include rollback notes and validation steps in the stage report

## Acceptance
The migration exists for review but has not been executed against the database.