---
title: Entitlement Enforcement Regression
status: done
priority: high
type: feature
tags: [billing, subscriptions, entitlements, regression]
created_by: agent
created_at: 2026-09-26T19:51:37Z
position: 48
---

## Notes
Completed Phase 3 for the Flexible Plan System. Migrated applicable application access decisions from hard-coded plan names to database-driven plan limits, feature entitlements, and subscription status while preserving Starter, Business, Enterprise, trials, billing payments, RLS, and Auth behavior. Added database helper functions for boolean entitlements and numeric limits, rewired loyalty-program limit enforcement to `plan_entitlements` with legacy column fallback, added database trigger enforcement for reward expiration, premium templates, custom card branding, and customer/member limits, and updated staff/program/billing screens to use configured limits/features where applicable. Verified real database records: existing Trial, Starter, Business, and Enterprise/pro plans retained their configured prices/limits/features; a temporary Professional regression plan was created with AWG 85/month, feature entitlements, and limits, then archived so it cannot be newly selected while remaining non-destructive. Project validation passed.

## Checklist
- [x] Inspect remaining hard-coded plan-name checks and classify each as display, limit, feature entitlement, or subscription status
- [x] Add or reuse server/database helpers for business plan entitlements and numeric limits
- [x] Replace applicable loyalty program, staff, customer, and feature-access checks with database-driven limits/entitlements
- [x] Preserve existing billing, trial, upgrade, downgrade, and payment behavior
- [x] Verify custom plan limits and feature entitlements using real database records
- [x] Verify archived plans remain valid for assigned businesses but unavailable for new selection
- [x] Verify non-Super-Admin users cannot manage plan definitions
- [x] Run full project validation and final regression checks

## Acceptance
Business access is determined by subscribed plan configuration, limits, entitlements, and subscription status rather than hard-coded plan names where applicable.
Existing Starter, Business, Enterprise, trials, billing records, and subscriptions continue working.
A future custom plan can be configured by Super Admin without developer code changes for supported limits/features.