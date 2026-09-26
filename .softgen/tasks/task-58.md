---
title: Simplified Add-on Approval Flow
status: in_progress
priority: urgent
type: bug
tags: [billing, add-ons, approval, subscriptions]
created_by: agent
created_at: 2026-09-26T21:11:38Z
position: 58
---

## Notes
Simplify the Customer Capacity Add-on purchase process. Business Admins should request an add-on and see Pending Approval, with no add-on payment-proof upload or document step. Super Admins should approve or reject directly. Approval activates the add-on, sets the actual activation timestamp, records approver metadata, updates effective capacity through the existing entitlement logic, and updates the subscription total as base plan price plus active approved add-on prices. Rejection must preserve request history, keep the add-on inactive, and not change capacity or subscription totals. Do not delete or break payment-proof functionality used by other payment flows. Do not create a new payment system or separate billing architecture.

## Checklist
- [ ] Inspect current add-on request API, business billing UI, Super Admin review UI, and database lifecycle fields
- [ ] Remove payment-proof upload requirement from Customer Capacity Add-on business UI only
- [ ] Update add-on request creation to represent Pending Approval without requiring proof upload
- [ ] Update Super Admin UI to show add-on approval requests with current/new subscription total and capacity change
- [ ] Update Super Admin approval/rejection logic so only Super Admin activates or rejects add-ons
- [ ] Verify `starts_at` is populated correctly for pending and active add-on lifecycle states
- [ ] Verify capacity and subscription total change only after approval
- [ ] Run project validation and targeted database regression checks

## Acceptance
Business Admins can request customer-capacity add-ons without uploading payment proof.
Super Admins can approve or reject add-on requests directly.
Approved add-ons activate and update capacity/subscription total; rejected add-ons remain inactive and preserved in history.