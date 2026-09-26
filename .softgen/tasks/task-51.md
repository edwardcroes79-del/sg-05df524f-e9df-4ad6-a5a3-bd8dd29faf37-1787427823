---
title: Customer Capacity Add-on Entitlements
status: done
priority: high
type: feature
tags: [billing, subscriptions, add-ons, entitlements]
created_by: agent
created_at: 2026-09-26T20:13:18Z
position: 51
---

## Notes
Implemented Phase 3 for the Add-on System. Connected purchased customer-capacity add-ons to the business effective customer/member limit using the formula: base plan customer limit plus active customer-capacity add-ons equals effective customer limit. Calculation and enforcement now happen server-side/database-side through `get_business_effective_numeric_limit(...)` and the updated `enforce_customer_member_limit()` function. Base plan limits were not modified, billing-provider charging was not changed, and browser-provided limits are not trusted. Existing customers, loyalty cards, stamps, and rewards remain intact when add-ons are cancelled or capacity is reduced; only new customer registrations/card joins are blocked once the effective limit is reached. Added `business_addon_subscriptions`, RLS, active add-on capacity helpers, Super Admin assignment/cancel-at-period-end controls, and Business Admin capacity visibility. Targeted database regression verified that multiple active add-ons combine correctly and cancelled add-ons stop contributing without dropping below the base plan. Project validation passed.

## Checklist
- [x] Inspect current add-on definition schema, customer limit enforcement function, and relevant UI/API flows
- [x] Add business add-on subscription storage with RLS and safe statuses
- [x] Add server/database helper for effective numeric limits including active customer-capacity add-ons
- [x] Update customer/member limit enforcement to use effective customer limit
- [x] Add Super Admin controls to assign/view/cancel business customer-capacity add-ons without changing base plans
- [x] Show effective customer capacity clearly to Business Admins where limits are displayed
- [x] Verify multiple active add-ons combine correctly
- [x] Verify cancelled/ended add-ons stop contributing without deleting customer data
- [x] Run project validation and targeted database regression checks

## Acceptance
Effective customer capacity equals base plan limit plus active customer-capacity add-ons.
Customer/member limit enforcement is server-side and cannot be bypassed from the browser.
Existing customers and loyalty data remain safe when add-ons are cancelled or capacity is reduced.