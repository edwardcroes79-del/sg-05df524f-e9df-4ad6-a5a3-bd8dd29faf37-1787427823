---
title: Add-on System Audit
status: done
priority: high
type: chore
tags: [billing, subscriptions, add-ons, audit]
created_by: agent
created_at: 2026-09-26T20:01:30Z
position: 49
---

## Notes
Completed Phase 1 audit only for a future flexible subscription add-on system. No production behavior, billing, existing plans, customer limits, subscriptions, or add-on records were modified. Current architecture uses base business subscription fields on `businesses`, database-driven plan rows in `subscription_plans`, and feature/limit rows in `plan_entitlements`. Current customer/member capacity is enforced at the database level by `enforce_customer_member_limit()`, which reads `max_customers` from the business base plan through `get_business_numeric_limit(...)`. Current billing is manual bank-transfer/admin approval; no active Stripe/product/price ID references were found in app code. Recommended architecture: keep the required base plan, add `subscription_addons` for add-on definitions, add `business_addon_subscriptions` for active business add-ons, and introduce an effective entitlement helper that calculates base plan limits plus active add-on capacity.

## Checklist
- [x] Inspect current subscription, plan, entitlement, and payment tables
- [x] Inspect current customer/member limit enforcement
- [x] Inspect billing, upgrade/downgrade, trial, and Super Admin plan management flows
- [x] Identify hard-coded limits or provider ID assumptions relevant to add-ons
- [x] Recommend safe recurring add-on architecture without implementation
- [x] Recommend Phase 2 implementation plan
- [x] Stop without production changes

## Acceptance
Current architecture is documented with evidence from schema and code inspection.
Recommended add-on architecture is provided without modifying production behavior.
Phase 2 implementation plan is defined and ready for explicit approval.