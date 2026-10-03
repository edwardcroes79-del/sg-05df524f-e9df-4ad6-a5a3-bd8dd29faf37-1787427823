---
title: Quick Stamp QR add-on assignment
status: done
priority: urgent
type: bug
tags: [admin, addons, quick-stamp, entitlements]
created_by: agent
created_at: 2026-10-03T18:03:22Z
position: 111
---

## Notes
Investigated and fixed why the existing active `QUICK_STAMP_QR` add-on appeared in add-on management but was excluded from the Super Admin Business Add-ons assignment dropdown. Root cause: the Super Admin dropdown and `/api/admin/business-addons` assignment endpoint only allowed `customer_capacity` add-ons, so Quick Stamp QR was filtered out and rejected even though the entitlement checks already recognize active approved Quick Stamp QR subscriptions. Reused the existing add-on record and identifier; no duplicate add-on or mock data was created. Quick Stamp QR now appears as an active assignable feature-access add-on, saves with the selected business, correct add-on ID, quantity `1`, and current billing period, and does not increase customer capacity. Customer-capacity add-on behavior remains preserved. Server-side assignment still requires Super Admin authentication and active add-on status. Existing approval, activation, deactivation, RLS, and entitlement behavior were not weakened. Project validation passed with no CSS, linting, TypeScript, or server errors. Live Super Admin assignment/activation could not be physically clicked from the sandbox, but the affected UI/API paths and entitlement-compatible persisted fields were verified by code inspection and build validation.

## Checklist
- [x] Inspect database schema for add-ons, business add-ons, billing period fields, and entitlement-related objects
- [x] Inspect Super Admin Business Add-ons UI dropdown filtering
- [x] Inspect admin add-on assignment APIs and approval/activation/deactivation paths
- [x] Inspect server-side Quick Stamp QR entitlement checks
- [x] Identify root cause for `QUICK_STAMP_QR` exclusion
- [x] Apply the smallest safe fix without changing unrelated add-ons
- [x] Verify assignment, approval, activation, deactivation, and feature access paths where possible
- [x] Run project validation

## Acceptance
`QUICK_STAMP_QR` appears in the Super Admin Business Add-ons assignment dropdown when active and assignable.
Assigning Quick Stamp QR saves the correct business, add-on, quantity, and billing period without increasing customer capacity.
Existing server-side entitlement checks unlock Quick Stamp QR for the assigned business only when appropriate.