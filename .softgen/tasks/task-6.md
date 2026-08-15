---
title: Phase 6 - SaaS Subscriptions & Super Admin
status: done
priority: urgent
type: feature
tags: [subscriptions, plans, super-admin, limits]
created_by: agent
created_at: 2026-08-15T19:00:00Z
position: 6
---
## Notes
- Build subscription plan limits enforcement (loyalty program count limits, customer count limits).
- Build a fully functional Super Admin panel to manage businesses, subscriptions, plans, system settings, and suspend/activate accounts.
- Enforce RLS rules to ensure Super Admin has read/write privileges on all businesses/users, while normal tenants remain fully isolated.

## Checklist
- [x] Create/Update subscription_plans table to hold plan definitions (limits, pricing, etc.)
- [x] Implement system-wide limits check helper or check limits inside creation flows
- [x] Build Super Admin Dashboard (`/admin`) and sub-views (businesses, users, plans)
- [x] Add suspension mechanism for businesses and test that suspended business users/customers cannot perform operations
- [x] Add Super Admin role enforcement in database and frontend auth flows

## Acceptance
- Super Admin can view, edit, suspend/activate any business and plan limits
- Businesses are blocked from creating more programs/customers than allowed by their plan limits
- Suspended businesses immediately block staff login or operations