---
title: Super Admin Plan Management
status: in_progress
priority: high
type: feature
tags: [billing, subscriptions, admin, entitlements]
created_by: agent
created_at: 2026-09-26T19:44:21Z
position: 47
---

## Notes
Implement Phase 2 for the Flexible Plan System. Add database-driven subscription plan management to the existing Super Admin area without changing existing business subscriptions, existing billing payments, or prices for Starter, Business, and Enterprise. Preserve existing plans exactly. Super Admin must be able to create, view, edit, activate, deactivate, and archive plans; configure plan limits; and configure only feature entitlements that actually exist in Royalty Stamp. Archived plans must remain valid for already-assigned businesses but unavailable for new selection. Only Super Admin may manage plans. Do not expose privileged credentials in browser code and do not disable RLS.

## Checklist
- [ ] Inspect live subscription plan schema, RLS, and current Super Admin billing UI
- [ ] Add compatible database fields/tables for flexible plan status, display metadata, and feature entitlements without duplicating existing plans
- [ ] Preserve and backfill Starter, Business, and Enterprise with current prices and limits
- [ ] Add secure Super Admin-only API routes for plan create, update, status changes, and entitlement configuration
- [ ] Add plan management UI to the existing Super Admin area using real database data
- [ ] Ensure archived plans cannot be newly selected while existing assigned businesses keep working
- [ ] Verify non-Super-Admin users cannot manage plans
- [ ] Verify feature entitlements and limits are stored correctly
- [ ] Run project validation

## Acceptance
Super Admin can manage subscription plans from the existing admin area without code changes for new plans.
Existing Starter, Business, and Enterprise plans and assigned businesses continue working unchanged.
Plan feature access and limits are stored in database-driven records rather than relying on new hard-coded plan names.