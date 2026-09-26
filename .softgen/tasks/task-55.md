---
title: Add-on Subscription Integration
status: done
priority: urgent
type: bug
tags: [billing, subscriptions, add-ons, payment-workflow]
created_by: agent
created_at: 2026-09-26T20:45:39Z
position: 55
---

## Notes
Fixed the Customer Capacity Add-on billing workflow so add-ons become components of the Business's existing subscription instead of separate standalone recurring add-on payments. The recurring total is calculated from database values: base plan monthly price plus active approved add-on monthly prices. Add-on purchase now creates a pending subscription-change payment for the full new monthly subscription total and uses one payment proof for the complete subscription amount. Super Admin review shows the complete subscription change, requires proof for manual bank-transfer payments, approves by activating the pending add-on subscription, rejects without activation, and preserves payment history. Existing Starter, Business, Enterprise, custom plan pricing, trials, upgrades/downgrades, billing history, and customer limit enforcement remain intact. Business proof upload stores a private `payment-proofs` storage path on `subscription_payments.payment_proof_url` so signed URLs can be generated for the owning Business and Super Admin. Targeted security checks verified private proof storage, database-driven add-on pricing, subscription-change metadata support, no client-side approval path, and active customer-limit enforcement. Project validation passed.

## Checklist
- [x] Inspect current add-on purchase/payment and Super Admin approval code paths
- [x] Update Business add-on purchase API to create full subscription-change payments instead of separate add-on-only payments
- [x] Update Business Billing UI to show base price, active add-ons, current total, pending new total, and one proof upload for the complete subscription payment
- [x] Update Super Admin review to display full subscription change details and approve/reject correctly
- [x] Preserve cancellation-at-period-end behavior and show current vs next billing total
- [x] Prevent duplicate pending/active same add-on subscriptions without blocking valid multiple add-ons
- [x] Verify business isolation, staff restriction, and no self-approval
- [x] Run project validation and targeted billing regression checks

## Acceptance
Business add-on purchases are handled as subscription changes with one total subscription payment.
Super Admin approval activates add-ons and updates effective entitlement without separate add-on recurring charges.
Existing subscription billing behavior remains intact for businesses without add-ons.