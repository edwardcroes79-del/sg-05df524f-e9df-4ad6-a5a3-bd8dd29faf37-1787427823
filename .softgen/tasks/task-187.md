---
title: Clean Duplicated Corporate Location Setup
status: in_progress
priority: high
type: bug
tags: [plans, locations, entitlements, safety]
created_by: agent
created_at: 2026-10-13T18:39:33Z
position: 187
---

## Notes
Ensure duplicated Corporate subscription plans produce a clean location setup for assigned businesses. Preserve the original Santa Cruz location’s four stamp transactions and all historical records. Duplicated plans must copy only subscription plan configuration and feature entitlements, never business locations, active-location selections, staff-location assignments, customers, stamps, rewards, subscriptions, or transactions. A new business assigned to a duplicated plan must start without inherited locations and be able to create/manage its own locations when its saved entitlements allow it. Existing test/demo locations with historical records need a safe way to remove them from active operations while preserving history. Permanent deletion is allowed only for locations with no protected dependencies. Do not bypass dependency checks, cascade-delete history, alter existing subscriptions, modify production business data, run destructive migrations, or deploy.

## Checklist
- [ ] Inspect duplicate-plan API/UI to confirm only plan configuration and entitlements are copied
- [ ] Inspect location creation, deletion, deactivation, active-location cleanup, and capacity refresh behavior
- [ ] Inspect staff-location assignment entitlement authorization for duplicated plans
- [ ] Apply smallest safe fixes for clean duplicated-plan location setup and inactive-location retirement if needed
- [ ] Run checks and report root cause, changed files, migrations, and tests

## Acceptance
A new business assigned to a duplicated Corporate plan starts with no copied business locations or assignments and can create/manage its own locations when entitled. Historical Santa Cruz stamp transactions remain intact. Locations with dependencies are preserved and can be removed from active operations safely; unused locations can be permanently deleted.