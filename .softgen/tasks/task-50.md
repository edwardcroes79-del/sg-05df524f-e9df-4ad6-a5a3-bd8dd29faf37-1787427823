---
title: Customer Capacity Add-on Management
status: in_progress
priority: high
type: feature
tags: [billing, subscriptions, add-ons, admin]
created_by: agent
created_at: 2026-09-26T20:07:06Z
position: 50
---

## Notes
Implement Phase 2 for the Add-on System. Create database-driven customer capacity add-on definitions and Super Admin management only. Initial add-ons: +100 customers AWG 5/month, +250 customers AWG 8/month, +500 customers AWG 12/month, +1,000 customers AWG 20/month. Prices, capacity, display order, and status must be editable by Super Admin without code changes. Do not change effective customer limits yet, do not assign add-ons to businesses, do not modify existing plans/subscriptions/billing payments, and do not change customer limit enforcement. Preserve RLS, business isolation, and Super Admin-only permissions.

## Checklist
- [ ] Inspect current schema and existing Super Admin API/UI plan-management pattern
- [ ] Add database table for configurable subscription add-on definitions without touching effective limits
- [ ] Seed initial customer capacity add-ons without hard-coding application prices
- [ ] Add secure Super Admin-only API for add-on create/edit/status management
- [ ] Add add-on management UI to the existing Super Admin area
- [ ] Ensure archived add-ons are not positioned for new purchase while preserving historical records
- [ ] Verify non-Super-Admin users cannot manage add-ons
- [ ] Run project validation

## Acceptance
Super Admin can create, edit, activate, deactivate, and archive customer capacity add-on definitions.
Initial add-on prices and capacities are stored in the database and editable without code changes.
No effective customer/member limits, business add-on subscriptions, existing plans, or billing records are changed in this phase.