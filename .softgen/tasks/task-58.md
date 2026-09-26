---
title: Simplified Add-on Approval Flow
status: done
priority: urgent
type: bug
tags: [billing, add-ons, approval, subscriptions]
created_by: agent
created_at: 2026-09-26T21:11:38Z
position: 58
---

## Notes
Simplified the Customer Capacity Add-on purchase process. Business Admins now request an add-on and see Pending Approval, with no add-on payment-proof upload or document step. Super Admins can approve or reject directly. Approval activates the add-on, sets the actual activation timestamp, records approver metadata, updates effective capacity through the existing entitlement logic, and updates the subscription total as base plan price plus active approved add-on prices. Rejection preserves request history, keeps the add-on inactive, and does not change capacity or subscription totals. Payment-proof functionality used by unrelated payment flows was not deleted or changed. The implementation creates direct `business_addon_subscriptions` pending approval records instead of add-on subscription payment records; Business Billing shows pending/active/rejected add-on states without proof upload; Super Admin Add-ons view can directly approve or reject pending customer-capacity add-on requests. Live database regression confirmed pending requests have non-null `starts_at`, pending requests do not increase capacity, approval sets a real activation timestamp and increases capacity, rejection preserves history without increasing capacity, and the simplified flow creates no add-on payment records. Project validation passed.

## Checklist
- [x] Inspect current add-on request API, business billing UI, Super Admin review UI, and database lifecycle fields
- [x] Remove payment-proof upload requirement from Customer Capacity Add-on business UI only
- [x] Update add-on request creation to represent Pending Approval without requiring proof upload
- [x] Update Super Admin UI to show add-on approval requests with current/new subscription total and capacity change
- [x] Update Super Admin approval/rejection logic so only Super Admin activates or rejects add-ons
- [x] Verify `starts_at` is populated correctly for pending and active add-on lifecycle states
- [x] Verify capacity and subscription total change only after approval
- [x] Run project validation and targeted database regression checks

## Acceptance
Business Admins can request customer-capacity add-ons without uploading payment proof.
Super Admins can approve or reject add-on requests directly.
Approved add-ons activate and update capacity/subscription total; rejected add-ons remain inactive and preserved in history.