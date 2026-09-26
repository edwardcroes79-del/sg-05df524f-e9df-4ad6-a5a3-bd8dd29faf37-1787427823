---
title: Business Add-on Purchase and Billing
status: in_progress
priority: high
type: feature
tags: [billing, subscriptions, add-ons, business-admin]
created_by: agent
created_at: 2026-09-26T20:20:04Z
position: 52
---

## Notes
Implement Phase 4 for the Add-on System. Business Admins should be able to view available active customer-capacity add-ons, see included/base capacity, current usage, effective capacity, active purchased add-ons, monthly add-on cost, status, start date, next billing date when available, and cancel eligible add-ons through the existing billing architecture. Do not create a separate payment system. Preserve existing plans, subscriptions, free trials, upgrades, downgrades, billing history, and customer limit enforcement. Business Admins can manage only their own business add-ons; staff must not manage billing unless existing permissions explicitly allow it. Do not expose privileged credentials in the browser.

## Checklist
- [ ] Inspect current business billing, payment, and add-on subscription architecture
- [ ] Add secure Business Admin API to request/purchase and cancel customer-capacity add-ons using existing billing records/workflow
- [ ] Add Customer Capacity section to Business Billing/Subscription UI with usage, included capacity, effective capacity, and available add-ons
- [ ] Show active add-ons with capacity, cost, status, start date, next billing date, and cancellation option
- [ ] Ensure cancellation follows billing-period rules and does not immediately delete/reduce existing customer data
- [ ] Verify business isolation and staff restrictions
- [ ] Run project validation and targeted database regression checks

## Acceptance
Business Admins can view and request/purchase available customer-capacity add-ons for their own business only.
Active add-ons and cancellation state are visible in the existing Business Billing area.
Existing plans, subscriptions, trials, upgrades/downgrades, billing history, and customer limits remain intact.