---
title: Flexible Plan System Audit
status: in_progress
priority: high
type: chore
tags: [billing, subscriptions, architecture, audit]
created_by: agent
created_at: 2026-09-26T19:40:51Z
position: 46
---

## Notes
Audit-only Phase 1 for making the Royalty Stamp subscription plan system flexible and database-driven. Do not change production billing behavior, customer subscriptions, existing plans, pricing, entitlements, payment integrations, Supabase Auth, or RLS. Inspect where plans/prices/limits/statuses are stored, where Starter/Business/Enterprise are hard-coded, how upgrades/downgrades/trials work, and recommend a safe Phase 2 architecture without implementing it.

## Checklist
- [ ] Inspect database schema for plan/subscription-related tables and business subscription columns
- [ ] Search for hard-coded plan names, pricing, limits, and feature checks
- [ ] Inspect billing, admin, business approval, registration, and limit enforcement flows
- [ ] Identify current subscription structure and entitlement model
- [ ] Produce recommended database-driven plan/entitlement architecture
- [ ] Document risks and a Phase 2 implementation plan
- [ ] Stop without production behavior changes

## Acceptance
Current architecture and hard-coded references are documented.
Future database-driven plan architecture is recommended without implementation.
Existing subscription behavior remains unchanged.