---
title: Customer Capacity Add-on Management
status: done
priority: high
type: feature
tags: [billing, subscriptions, add-ons, admin]
created_by: agent
created_at: 2026-09-26T20:07:06Z
position: 50
---

## Notes
Implemented Phase 2 for the Add-on System. Created database-driven customer capacity add-on definitions and Super Admin management only. Initial add-ons were seeded in the database: +100 customers AWG 5/month, +250 customers AWG 8/month, +500 customers AWG 12/month, +1,000 customers AWG 20/month. Prices, capacity, display order, provider metadata, and status are editable by Super Admin without code changes. Effective customer limits were not changed, add-ons were not assigned to businesses, existing plans/subscriptions/billing payments were not modified, and existing customer limit enforcement was not changed. Preserved RLS, business isolation, and Super Admin-only permissions. Added `subscription_addons` table with RLS, seeded initial customer-capacity add-on definitions, added secure `/api/admin/addons` route, and added Super Admin add-on management UI. Project validation passed.

## Checklist
- [x] Inspect current schema and existing Super Admin API/UI plan-management pattern
- [x] Add database table for configurable subscription add-on definitions without touching effective limits
- [x] Seed initial customer capacity add-ons without hard-coding application prices
- [x] Add secure Super Admin-only API for add-on create/edit/status management
- [x] Add add-on management UI to the existing Super Admin area
- [x] Ensure archived add-ons are not positioned for new purchase while preserving historical records
- [x] Verify non-Super-Admin users cannot manage add-ons
- [x] Run project validation

## Acceptance
Super Admin can create, edit, activate, deactivate, and archive customer capacity add-on definitions.
Initial add-on prices and capacities are stored in the database and editable without code changes.
No effective customer/member limits, business add-on subscriptions, existing plans, or billing records are changed in this phase.