---
title: Excel Member Import Entitlement
status: in_progress
priority: high
type: feature
tags: [plans, entitlements, import]
created_by: agent
created_at: 2026-10-14T12:34:59Z
position: 195
---

## Notes
Add a separate `excel_member_import` entitlement for Royalty Stamp. Inspect the current plan entitlement registry, Super Admin plan management, live schema, migrations, and existing `excel_member_export` behavior before changing anything. Corporate and Enterprise should be enabled by default only if this matches the current plan model. Other plans remain disabled by default. Custom and duplicated plans must follow saved entitlement rows, not hardcoded plan names. Do not change prices, limits, visibility, unrelated entitlements, subscriptions, customer data, RLS, or deployment state. If a migration is required, prepare and explain it before applying.

## Checklist
- [ ] Inspect existing export entitlement, plan entitlement registry, Super Admin plan-management API/UI, and live schema
- [ ] Determine whether a migration or seed update is required for `excel_member_import`
- [ ] Add entitlement support without changing prices, limits, visibility, or unrelated entitlements
- [ ] Verify Corporate/Enterprise default behavior and custom/duplicated plan saved entitlement behavior
- [ ] Run checks and document migration requirements and entitlement behavior

## Acceptance
Super Admin can manage `excel_member_import` as a separate entitlement. Backend import authorization can check it without hardcoding plan names. Existing export entitlement behavior remains unchanged.