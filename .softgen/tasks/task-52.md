---
title: Business Add-on Purchase and Billing
status: done
priority: high
type: feature
tags: [billing, subscriptions, add-ons, business-admin]
created_by: agent
created_at: 2026-09-26T20:20:04Z
position: 52
---

## Notes
Implemented Phase 4 for the Add-on System. Business Admins can now view available active customer-capacity add-ons, see included/base capacity, current real usage, effective capacity, active purchased add-ons, monthly add-on cost, status, start date, next billing date when available, and cancel eligible add-ons through the existing bank-transfer billing architecture. Added secure Business Owner-only `/api/business/addons` route that lists available add-ons, creates pending bank-transfer `subscription_payments` plus pending `business_addon_subscriptions`, and schedules approved add-on cancellation at period end. Super Admin payment approval now distinguishes add-on purchases from base-plan upgrades: approving an add-on payment activates the referenced add-on subscription, while rejecting it cancels the pending add-on subscription. Existing plans, subscriptions, free trials, upgrades, downgrades, billing history, and customer limit enforcement remain intact. Project validation passed.

## Checklist
- [x] Inspect current business billing, payment, and add-on subscription architecture
- [x] Add secure Business Admin API to request/purchase and cancel customer-capacity add-ons using existing billing records/workflow
- [x] Add Customer Capacity section to Business Billing/Subscription UI with usage, included capacity, effective capacity, and available add-ons
- [x] Show active add-ons with capacity, cost, status, start date, next billing date, and cancellation option
- [x] Ensure cancellation follows billing-period rules and does not immediately delete/reduce existing customer data
- [x] Verify business isolation and staff restrictions
- [x] Run project validation and targeted database regression checks

## Acceptance
Business Admins can view and request/purchase available customer-capacity add-ons for their own business only.
Active add-ons and cancellation state are visible in the existing Business Billing area.
Existing plans, subscriptions, trials, upgrades/downgrades, billing history, and customer limits remain intact.