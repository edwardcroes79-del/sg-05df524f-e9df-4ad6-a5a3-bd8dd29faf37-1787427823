---
title: Corporate Enterprise Feature Standardization
status: in_progress
priority: high
type: feature
tags: [admin, pricing, plans, entitlements]
created_by: agent
created_at: 2026-10-13T16:59:43Z
position: 179
---

## Notes
Standardize feature entitlements across Corporate, Enterprise, and newly created subscription plans. Scope is Super Admin plan configuration and homepage pricing display only. Use the existing Corporate plan as the reference feature set after inspection. Corporate and Enterprise should have identical feature entitlements while preserving distinct configured prices, capacity limits, and location limits. New plan creation should prepopulate the same standard feature set by default while allowing Super Admins to intentionally change features before saving. Do not change authentication, authorization, RLS, billing, existing subscriptions, or subscription enforcement. Do not silently change database-backed limits. Report any advertised feature that appears display-only or lacks confirmed enforcement.

## Checklist
- [ ] Inspect Super Admin plan create/edit workflow, admin plans API, homepage pricing formatter, and current database-backed Corporate/Enterprise entitlements
- [ ] Identify the authoritative source for plan feature entitlements and any drift between Corporate, Enterprise, homepage, and Super Admin display
- [ ] Implement a reusable default standard feature set for new plan creation without duplicating hardcoded lists that can drift
- [ ] Apply the smallest safe Corporate/Enterprise feature consistency correction without changing prices, limits, billing, auth, RLS, or existing subscriptions
- [ ] Verify homepage and Super Admin display the same saved feature entitlements
- [ ] Run checks, review final diff, and report modified files, database changes if any, discrepancies, and manual tests

## Acceptance
Corporate and Enterprise show the same feature list and have matching configured feature entitlements. New plans are prepopulated with the standard feature set by default and remain editable. Plan-specific prices and limits remain distinct and no subscription enforcement, billing, auth, RLS, or existing subscriptions are unintentionally changed.