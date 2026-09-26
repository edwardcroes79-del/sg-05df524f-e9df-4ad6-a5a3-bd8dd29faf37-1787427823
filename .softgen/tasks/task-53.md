---
title: Customer Capacity Add-on Final Regression
status: in_progress
priority: high
type: chore
tags: [billing, subscriptions, add-ons, security, regression]
created_by: agent
created_at: 2026-09-26T20:26:24Z
position: 53
---

## Notes
Perform Phase 5 final security and regression testing for the Customer Capacity Add-on system. Do not introduce new features. Verify Starter, Business, Enterprise, and custom plan support; database-driven +100, +250, +500, and +1,000 customer add-on prices; effective customer capacity as base plan plus active add-ons; limit enforcement; cancellation behavior; RLS; business/customer isolation; Super Admin add-on definition control; Business Admin own-business add-on management only; staff restriction; client-side capacity manipulation resistance; payment secret safety; and existing subscription, trial, upgrade, downgrade, and billing history behavior. Stop after verification.

## Checklist
- [ ] Verify plan and add-on configuration records are database-driven
- [ ] Verify effective capacity calculation for no add-on, single add-ons, and multiple add-ons
- [ ] Verify customer limit blocking at the effective limit without deleting existing data
- [ ] Verify cancellation/end behavior preserves existing customers, cards, stamps, and rewards
- [ ] Verify RLS, business isolation, customer isolation, Super Admin permissions, Business Admin scope, and staff restrictions
- [ ] Verify billing, trials, upgrade/downgrade, and payment history remain intact
- [ ] Run project validation
- [ ] Document final architecture supports base plan plus active add-ons as effective entitlements

## Acceptance
Final regression confirms customer-capacity add-ons work through database-driven configuration and server-side enforcement.
Security checks confirm add-on definitions, purchases, cancellation, and capacity limits cannot be bypassed from the browser.
Existing billing/subscription behavior remains intact and future add-on types can be added without rebuilding the subscription system.