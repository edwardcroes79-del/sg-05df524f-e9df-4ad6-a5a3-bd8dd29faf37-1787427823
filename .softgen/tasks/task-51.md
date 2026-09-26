---
title: Customer Capacity Add-on Entitlements
status: in_progress
priority: high
type: feature
tags: [billing, subscriptions, add-ons, entitlements]
created_by: agent
created_at: 2026-09-26T20:13:18Z
position: 51
---

## Notes
Implement Phase 3 for the Add-on System. Connect purchased customer-capacity add-ons to the business effective customer/member limit using the formula: base plan customer limit plus active customer-capacity add-ons equals effective customer limit. Calculation and enforcement must happen server-side/database-side. Do not modify base plan limits, do not delete customers/cards/stamps/rewards when capacity is reduced, do not change billing-provider charging, and do not trust browser-provided limits. If a business is over its effective limit after cancellation, existing data remains intact and only new customer registrations/card joins are blocked with a clear error. Added `business_addon_subscriptions`, RLS, server-side effective-limit helpers, database-level customer limit enforcement using effective capacity, Super Admin assignment/cancel-at-period-end controls, and Business Admin capacity visibility.

## Checklist
- [x] Inspect current add-on definition schema, customer limit enforcement function, and relevant UI/API flows
- [x] Add business add-on subscription storage with RLS and safe statuses
- [x] Add server/database helper for effective numeric limits including active customer-capacity add-ons
- [x] Update customer/member limit enforcement to use effective customer limit
- [x] Add Super Admin controls to assign/view/cancel business customer-capacity add-ons without changing base plans
- [x] Show effective customer capacity clearly to Business Admins where limits are displayed
- [x] Verify multiple active add-ons combine correctly
- [x] Verify cancelled/ended add-ons stop contributing without deleting customer data
- [ ] Run project validation and targeted database regression checks

## Acceptance
Effective customer capacity equals base plan limit plus active customer-capacity add-ons.
Customer/member limit enforcement is server-side and cannot be bypassed from the browser.
Existing customers and loyalty data remain safe when add-ons are cancelled or capacity is reduced.