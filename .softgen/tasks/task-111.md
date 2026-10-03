---
title: Quick Stamp QR add-on assignment
status: in_progress
priority: urgent
type: bug
tags: [admin, addons, quick-stamp, entitlements]
created_by: agent
created_at: 2026-10-03T18:03:22Z
position: 111
---

## Notes
Investigate and fix why the existing active `QUICK_STAMP_QR` add-on appears in add-on management but is excluded from the Super Admin Business Add-ons assignment dropdown. Use the existing add-on record and identifier. Do not create duplicate add-ons or mock data. Preserve customer-capacity assignment behavior, billing approval/activation/deactivation rules, RLS, and server-side entitlement checks. Quick Stamp QR must grant feature access only and must not increase customer capacity.

## Checklist
- [ ] Inspect database schema for add-ons, business add-ons, billing period fields, and entitlement-related objects
- [ ] Inspect Super Admin Business Add-ons UI dropdown filtering
- [ ] Inspect admin add-on assignment APIs and approval/activation/deactivation paths
- [ ] Inspect server-side Quick Stamp QR entitlement checks
- [ ] Identify root cause for `QUICK_STAMP_QR` exclusion
- [ ] Apply the smallest safe fix without changing unrelated add-ons
- [ ] Verify assignment, approval, activation, deactivation, and feature access paths where possible
- [ ] Run project validation

## Acceptance
`QUICK_STAMP_QR` appears in the Super Admin Business Add-ons assignment dropdown when active and assignable.
Assigning Quick Stamp QR saves the correct business, add-on, quantity, and billing period without increasing customer capacity.
Existing server-side entitlement checks unlock Quick Stamp QR for the assigned business only when appropriate.