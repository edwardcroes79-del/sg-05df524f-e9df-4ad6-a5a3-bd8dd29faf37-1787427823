---
title: Duplicated Corporate Location UI Parity
status: in_progress
priority: high
type: bug
tags: [plans, entitlements, dashboard, locations]
created_by: agent
created_at: 2026-10-13T18:18:07Z
position: 183
---

## Notes
Investigate why a duplicated Corporate plan does not reproduce the full Corporate dashboard experience, especially the active-location selector and Locations page functionality. Scope includes dashboard menus, feature access, location-management UI, active-location selector loading/switching, backend location authorization, and plan duplication entitlement copying. Do not deploy, do not perform destructive database changes, do not alter production subscriptions, and do not copy business-specific data like locations, active location, staff assignments, customers, or subscriptions into plan configuration. Preserve location isolation so a business can only see/select its own authorized locations. First report the root cause and proposed changes, then implement the smallest safe fix. Confirm whether existing businesses using duplicated plans need entitlement refresh/recalculation before modifying anything.

## Checklist
- [ ] Trace original Corporate dashboard menu, feature access, location-management functionality, and active-location selector behavior
- [ ] Identify any remaining hardcoded Corporate plan-name, plan-ID, tier, or dashboard checks blocking duplicated plans
- [ ] Inspect duplicate-plan copying of feature flags, entitlements, location limits, and relevant reusable configuration
- [ ] Replace unsafe hardcoded gates with configured entitlement/limit checks while preserving backend authorization and lower-tier restrictions
- [ ] Verify active-location selector loads only authorized business locations and switches safely
- [ ] Run static checks and report root cause, modified files, migrations, manual tests, and any entitlement-refresh limitation

## Acceptance
A business assigned to a duplicated Corporate plan with copied Corporate entitlements sees the same authorized Corporate dashboard features as the original Corporate plan, including the active-location selector and Locations page. Editing the duplicate does not modify Corporate. Lower-tier plans remain restricted unless their saved entitlements allow access.