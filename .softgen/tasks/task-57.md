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
Fix the Customer Capacity Add-on purchase failure where inserting into `business_addon_subscriptions` violates the NOT NULL constraint on `starts_at`. Investigation confirmed the table requires `starts_at` and `current_period_start`, both with database defaults of `now()`. Effective entitlement logic only counts rows where `status = 'active'`, `payment_status = 'approved'`, `starts_at <= now()`, and not ended, so a row can safely have database-populated period timestamps while remaining non-contributing as `inactive`/`pending`. The purchase API was incorrectly overriding those defaults with explicit `null` values. The fix removes explicit null start dates, stores request metadata, keeps pending add-ons `inactive`/`pending` until Super Admin approval, and cleans up the pending add-on row if payment record creation fails. Rejection handling now uses the table's actual `payment_status` allowed value `failed` while preserving rejection history in metadata.

## Checklist
- [x] Inspect `business_addon_subscriptions` schema, constraints, defaults, and required columns
- [x] Inspect existing add-on purchase API insert and Super Admin approval activation logic
- [x] Inspect subscription billing-period/start-date conventions used by existing plan billing
- [x] Fix pending add-on purchase creation so `starts_at` and other required fields are populated correctly without marking the add-on active
- [x] Ensure failed purchase creation does not leave orphan payment/add-on records
- [ ] Verify all four customer-capacity add-ons can create pending purchase records without NOT NULL errors
- [ ] Verify approval activates the add-on at the correct workflow point and capacity increases only after activation
- [ ] Run project validation and targeted database regression checks

## Acceptance
Add-on purchase requests insert valid `business_addon_subscriptions` rows without `starts_at` NULL errors.
Pending add-ons remain inactive until Super Admin approval and do not increase capacity early.
Actual database rows show correct business, add-on, status, pricing metadata, billing dates, and no duplicate active/pending subscriptions.