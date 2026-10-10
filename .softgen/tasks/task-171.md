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
Phase 2B scope only: inspect, remediate, and verify `customer_loyalty_cards` business/program isolation. Confirmed the target policies `customer_cards_insert_authorized_consistent` and `customer_cards_update_business_authorized` contained tautological `lp.business_id = lp.business_id` checks. RLS is enabled on `customer_loyalty_cards` and `loyalty_programs`. The card table already has foreign keys to `businesses`, `customers`, `loyalty_programs`, and `auth.users`, plus a unique customer/program constraint. Existing triggers include member limit enforcement, user ID population, and `validate_customer_loyalty_card_consistency()` on INSERT and UPDATE. The join flow in `src/pages/join/[id].tsx` creates cards with `business_id: program.business_id` and `loyalty_program_id: program.id`. No real customer rows or PII were read/exported. Applied only the two RLS policy corrections to compare `lp.business_id = customer_loyalty_cards.business_id`. No unrelated application behavior, schema objects, authentication, Turnstile, SMTP, password recovery, admin debug endpoint, rewards, stamps, pricing, subscriptions, or deployment were changed.

## Checklist
- [x] Inspect current policy definitions for `customer_loyalty_cards` and `loyalty_programs`
- [x] Inspect schemas, primary keys, foreign keys, nullable columns, unique constraints, RLS status, triggers, and related helper functions
- [x] Inspect application/API flows that create or update customer loyalty cards
- [x] Check for existing consistency constraints and existing inconsistent data without exposing PII
- [x] Apply the smallest safe policy/database correction if root cause is confirmed
- [ ] Validate INSERT and UPDATE business/program consistency with RLS-enforced sessions where possible
- [ ] Run TypeScript/lint validation and report actual tests

## Acceptance
`customer_loyalty_cards` cannot be inserted or updated with a `business_id` that does not match the referenced loyalty program’s `business_id`. Legitimate customer enrollment and authorized business operations remain compatible. No unrelated application behavior or production deployment is changed.