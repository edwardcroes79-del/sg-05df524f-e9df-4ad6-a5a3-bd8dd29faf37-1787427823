---
title: Add-on Subscription Start Date Fix
status: in_progress
priority: urgent
type: bug
tags: [billing, add-ons, subscriptions, database]
created_by: agent
created_at: 2026-09-26T21:05:19Z
position: 57
---

## Notes
Fix the Customer Capacity Add-on purchase failure where inserting into `business_addon_subscriptions` violates the NOT NULL constraint on `starts_at`. Investigate the actual schema, required columns, existing billing-period logic, add-on purchase API, Super Admin approval activation logic, and effective entitlement calculation before changing code. Do not remove the NOT NULL constraint, do not use client-provided dates, do not activate the add-on at purchase request time, and do not change payment-proof storage. The correct fix must create a complete pending/requested add-on subscription row with valid required fields while preserving activation only through Super Admin approval.

## Checklist
- [ ] Inspect `business_addon_subscriptions` schema, constraints, defaults, and required columns
- [ ] Inspect existing add-on purchase API insert and Super Admin approval activation logic
- [ ] Inspect subscription billing-period/start-date conventions used by existing plan billing
- [ ] Fix pending add-on purchase creation so `starts_at` and other required fields are populated correctly without marking the add-on active
- [ ] Ensure failed purchase creation does not leave orphan payment/add-on records
- [ ] Verify all four customer-capacity add-ons can create pending purchase records without NOT NULL errors
- [ ] Verify approval activates the add-on at the correct workflow point and capacity increases only after activation
- [ ] Run project validation and targeted database regression checks

## Acceptance
Add-on purchase requests insert valid `business_addon_subscriptions` rows without `starts_at` NULL errors.
Pending add-ons remain inactive until Super Admin approval and do not increase capacity early.
Actual database rows show correct business, add-on, status, pricing metadata, billing dates, and no duplicate active/pending subscriptions.