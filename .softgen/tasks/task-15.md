---
title: Fix Staff Role, Business Membership, and RLS
status: in_progress
priority: urgent
type: bug
tags: [auth, rls, staff, security]
created_by: agent
created_at: 2026-08-20T12:05:00Z
position: 15
---

## Notes
Phase 1 focuses on fixing the staff role, business membership, and RLS architecture. Staff users are currently being routed to the owner onboarding flow and cannot access their business context because RLS policies only check for business ownership (`owner_id`) and prevent staff from reading their own membership or business data.

## Checklist
- [x] Fix RLS helper functions (`can_access_business`, `is_business_operator`, `can_access_customer`) to include active staff members.
- [x] Fix RLS policies on `business_users` so staff can read their own membership.
- [x] Fix RLS policies on `businesses` so staff can read their assigned business details.
- [x] Fix RLS policies on `loyalty_programs`, `customer_loyalty_cards`, `stamp_transactions`, and `rewards` to use the updated helper functions for staff access.
- [x] Verify `login.tsx` and `DashboardLayout.tsx` correctly route staff based on updated RLS.
- [x] Run project error checks.

## Acceptance
Staff members can log in, bypass onboarding, load their assigned Business Dashboard, and view/manage business customers, loyalty programs, and stamps according to their permissions without seeing Business B's data.