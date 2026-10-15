---
title: Plan Entitlement Persistence
status: in_progress
priority: urgent
type: bug
tags: [admin, plans, entitlements]
created_by: agent
created_at: 2026-10-15T00:20:47Z
position: 212
---

## Notes
Bug: in the Royalty Stamp Super Admin plan editor, `excel_member_import` and `bulk_member_removal` checkboxes do not persist after pressing Push Plan. Scope: inspect the Super Admin plan editor, Push Plan handler, request payload, server-side save logic, validation/allowlist/schema mapping, and database entitlement rows. Compare both failing keys with a working boolean entitlement such as `excel_member_export`. Fix only the actual persistence drop/overwrite cause. Preserve true and false values, plan inheritance/business override behavior, Super Admin controls, and unrelated entitlements. Do not hardcode plan names, enable features globally, modify customer/membership/stamp/reward data, or deploy.

## Checklist
- [ ] Inspect Super Admin plan editor checkbox state for `excel_member_import` and `bulk_member_removal`
- [ ] Inspect Push Plan handler and payload serialization
- [ ] Inspect backend plan save endpoint and entitlement allowlist/mapping
- [ ] Inspect saved database entitlement rows and compare with `excel_member_export`
- [ ] Identify why the two keys are dropped, overwritten, or not reloaded
- [ ] Apply the smallest safe fix preserving both true and false values
- [ ] Verify all four true/false combinations on a safe test plan at database/runtime level
- [ ] Verify reload/read path returns saved checkbox values
- [ ] Run validation and report root cause, files changed, and test results

## Acceptance
`excel_member_import` and `bulk_member_removal` persist correctly after Push Plan and reload for all true/false combinations. Runtime entitlement resolution matches the saved values. Other entitlements remain unchanged.