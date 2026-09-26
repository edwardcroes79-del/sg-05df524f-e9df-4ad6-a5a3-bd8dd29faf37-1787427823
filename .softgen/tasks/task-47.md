---
title: Super Admin Plan Management
status: done
priority: high
type: feature
tags: [billing, subscriptions, admin, entitlements]
created_by: agent
created_at: 2026-09-26T19:44:21Z
position: 47
---

## Notes
Implemented Phase 2 for the Flexible Plan System. Added database-driven subscription plan management to the existing Super Admin area without changing existing business subscriptions, existing billing payments, or the requested prices for Starter, Business, and Enterprise. Existing plans were preserved and updated in place only for compatibility metadata/backfill. Database foundation added: flexible plan metadata columns and `plan_entitlements` table with RLS. Secure `/api/admin/plans` route added for Super Admin-only create/update/status/entitlement management. Super Admin UI now loads plans through the secure API, supports create, view/edit, activate, deactivate, and archive, persists configurable limits and existing feature entitlements, and hides archived plans from new business assignment while keeping currently assigned archived plans visible. Project validation passed.

## Checklist
- [x] Inspect live subscription plan schema, RLS, and current Super Admin billing UI
- [x] Add compatible database fields/tables for flexible plan status, display metadata, and feature entitlements without duplicating existing plans
- [x] Preserve and backfill Starter, Business, and Enterprise with current prices and limits
- [x] Add secure Super Admin-only API routes for plan create, update, status changes, and entitlement configuration
- [x] Add plan management UI to the existing Super Admin area using real database data
- [x] Ensure archived plans cannot be newly selected while existing assigned businesses keep working
- [x] Verify non-Super-Admin users cannot manage plans
- [x] Verify feature entitlements and limits are stored correctly
- [x] Run project validation

## Acceptance
Super Admin can manage subscription plans from the existing admin area without code changes for new plans.
Existing Starter, Business, and Enterprise plans and assigned businesses continue working unchanged.
Plan feature access and limits are stored in database-driven records rather than relying on new hard-coded plan names.