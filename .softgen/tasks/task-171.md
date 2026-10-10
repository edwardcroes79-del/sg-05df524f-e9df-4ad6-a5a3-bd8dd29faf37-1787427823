---
title: Loyalty Card Business Isolation
status: in_progress
priority: urgent
type: bug
tags: [security, rls, multi-tenant, loyalty-cards]
created_by: agent
created_at: 2026-10-10T16:58:53Z
position: 171
---

## Notes
Phase 2B scope only: inspect, remediate, and verify `customer_loyalty_cards` business/program isolation. The prior audit reported tautological policy conditions in `customer_cards_insert_authorized_consistent` and `customer_cards_update_business_authorized`: `lp.business_id = lp.business_id`. Must verify actual policy definitions and related schema before applying any fix. Do not modify unrelated tables, auth, Turnstile, SMTP, password recovery, admin debug endpoint, reward redemption, stamp balances, pricing, subscriptions, or deployment. Do not read/export real customer records or secrets. Use metadata and synthetic/RLS-safe tests only.

## Checklist
- [ ] Inspect current policy definitions for `customer_loyalty_cards` and `loyalty_programs`
- [ ] Inspect schemas, primary keys, foreign keys, nullable columns, unique constraints, RLS status, triggers, and related helper functions
- [ ] Inspect application/API flows that create or update customer loyalty cards
- [ ] Check for existing consistency constraints and existing inconsistent data without exposing PII
- [ ] Apply the smallest safe policy/database correction if root cause is confirmed
- [ ] Validate INSERT and UPDATE business/program consistency with RLS-enforced sessions where possible
- [ ] Run TypeScript/lint validation and report actual tests

## Acceptance
`customer_loyalty_cards` cannot be inserted or updated with a `business_id` that does not match the referenced loyalty program’s `business_id`. Legitimate customer enrollment and authorized business operations remain compatible. No unrelated application behavior or production deployment is changed.