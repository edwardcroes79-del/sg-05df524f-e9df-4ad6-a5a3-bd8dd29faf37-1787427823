---
title: Flexible Plan System Audit
status: done
priority: high
type: chore
tags: [billing, subscriptions, architecture, audit]
created_by: agent
created_at: 2026-09-26T19:40:51Z
position: 46
---

## Notes
Completed audit-only Phase 1 for making the Royalty Stamp subscription plan system flexible and database-driven. No production billing behavior, customer subscriptions, existing plans, pricing, entitlements, payment integrations, Supabase Auth, RLS, or code behavior was changed. Current architecture: plans are stored in `subscription_plans`; businesses store assignment in `businesses.subscription_plan`; plan status/trials use `subscription_status`, `trial_start`, and `trial_end`; limits and limited entitlements are stored as plan columns such as `max_loyalty_programs`, `max_customers`, `max_staff`, `includes_premium_templates`, `is_trial`, and `trial_days`. Hard-coded checks remain in billing, dashboard layout, dashboard overview, onboarding, and program template access for `starter`, `business`, `enterprise`, `pro`, and `trial`. Recommended future architecture: keep current plans intact, add database-driven entitlement records keyed by feature/limit, and migrate enforcement gradually with compatibility fallbacks.

## Checklist
- [x] Inspect database schema for plan/subscription-related tables and business subscription columns
- [x] Search for hard-coded plan names, pricing, limits, and feature checks
- [x] Inspect billing, admin, business approval, registration, and limit enforcement flows
- [x] Identify current subscription structure and entitlement model
- [x] Produce recommended database-driven plan/entitlement architecture
- [x] Document risks and a Phase 2 implementation plan
- [x] Stop without production behavior changes

## Acceptance
Current architecture and hard-coded references are documented.
Future database-driven plan architecture is recommended without implementation.
Existing subscription behavior remains unchanged.