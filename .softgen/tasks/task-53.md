---
title: Customer Capacity Add-on Final Regression
status: done
priority: high
type: chore
tags: [billing, subscriptions, add-ons, security, regression]
created_by: agent
created_at: 2026-09-26T20:26:24Z
position: 53
---

## Notes
Completed Phase 5 final security and regression testing for the Customer Capacity Add-on system without introducing new features. Verified plan and add-on configuration are database-driven, including customer-capacity add-ons for +100, +250, +500, and +1,000 customers with prices pulled from `subscription_addons.monthly_price_awg`. Verified the effective entitlement architecture: base plan limit plus active approved add-ons equals effective customer capacity. Targeted database regression passed for a custom plan with a 2,000 customer base limit, multiple active add-ons stacking to 2,750, scheduled cancellation retaining capacity until future period end, ended add-ons no longer contributing, registration blocked at the effective limit, and existing customer cards, stamp transactions, and rewards preserved after blocked registration. Security surfaces were inspected: RLS remains enabled on add-on tables, Super Admin-only add-on definition management is routed through secured admin APIs, Business Admin add-on purchase/cancellation is scoped to the owner’s own business, staff cannot manage billing through the Business Owner-only API, capacity is calculated server-side, and service-role credentials are used only server-side. Existing subscription, trial, upgrade/downgrade, and billing-history flows remain intact. Project validation passed.

## Checklist
- [x] Verify plan and add-on configuration records are database-driven
- [x] Verify effective capacity calculation for no add-on, single add-ons, and multiple add-ons
- [x] Verify customer limit blocking at the effective limit without deleting existing data
- [x] Verify cancellation/end behavior preserves existing customers, cards, stamps, and rewards
- [x] Verify RLS, business isolation, customer isolation, Super Admin permissions, Business Admin scope, and staff restrictions
- [x] Verify billing, trials, upgrade/downgrade, and payment history remain intact
- [x] Run project validation
- [x] Document final architecture supports base plan plus active add-ons as effective entitlements

## Acceptance
Final regression confirms customer-capacity add-ons work through database-driven configuration and server-side enforcement.
Security checks confirm add-on definitions, purchases, cancellation, and capacity limits cannot be bypassed from the browser.
Existing billing/subscription behavior remains intact and future add-on types can be added without rebuilding the subscription system.