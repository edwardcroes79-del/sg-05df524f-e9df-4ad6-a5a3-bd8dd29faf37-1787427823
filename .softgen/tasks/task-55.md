---
title: Add-on Subscription Integration
status: in_progress
priority: urgent
type: bug
tags: [billing, subscriptions, add-ons, payment-workflow]
created_by: agent
created_at: 2026-09-26T20:45:39Z
position: 55
---

## Notes
Change Customer Capacity Add-on billing so add-ons become components of the Business's existing subscription instead of separate standalone recurring add-on payments. The recurring total must be calculated from database values: base plan monthly price plus active approved add-on monthly prices. Add-on purchase should create a pending subscription-change payment for the full new monthly subscription total and use one payment proof for the complete subscription amount. Super Admin review should show the complete subscription change, approve by activating the pending add-on subscription, reject without activation, and preserve payment history. Existing Starter, Business, Enterprise, custom plan pricing, trials, upgrades/downgrades, billing history, and customer limit enforcement must remain intact.

## Checklist
- [x] Inspect current add-on purchase/payment and Super Admin approval code paths
- [ ] Update Business add-on purchase API to create full subscription-change payments instead of separate add-on-only payments
- [ ] Update Business Billing UI to show base price, active add-ons, current total, pending new total, and one proof upload for the complete subscription payment
- [ ] Update Super Admin review to display full subscription change details and approve/reject correctly
- [ ] Preserve cancellation-at-period-end behavior and show current vs next billing total
- [ ] Prevent duplicate pending/active same add-on subscriptions without blocking valid multiple add-ons
- [ ] Verify business isolation, staff restriction, and no self-approval
- [ ] Run project validation and targeted billing regression checks

## Acceptance
Business add-on purchases are handled as subscription changes with one total subscription payment.
Super Admin approval activates add-ons and updates effective entitlement without separate add-on recurring charges.
Existing subscription billing behavior remains intact for businesses without add-ons.