---
title: Plan Entitlement Persistence
status: done
priority: urgent
type: bug
tags: [admin, plans, entitlements]
created_by: agent
created_at: 2026-10-15T00:20:47Z
position: 212
---

## Notes
Fixed the Super Admin plan editor persistence regression for `excel_member_import` and `bulk_member_removal`. Root cause: the backend save allowlist accepted both keys, but the admin editor reload/read path did not preserve these two entitlement values in editable form state the same way it preserved working keys like `excel_member_export`. After reload, the missing values could be treated as false/omitted and then overwritten on Push Plan. The smallest safe fix was in `src/pages/admin/index.tsx`, adding both keys to the editable entitlement state mapping alongside the related member-management entitlements. No plan names were hardcoded, no global feature grants were added, and no customer, membership, stamp, reward, or production plan data was changed. `check_for_errors` passed. Rollback-only database verification with a temporary test plan/business confirmed all four combinations persist and resolve correctly: both enabled, both disabled, import enabled/removal disabled, and import disabled/removal enabled. The same verification confirmed `excel_member_export` stayed preserved.

## Checklist
- [x] Inspect Super Admin plan editor checkbox state for `excel_member_import` and `bulk_member_removal`
- [x] Inspect Push Plan handler and payload serialization
- [x] Inspect backend plan save endpoint and entitlement allowlist/mapping
- [x] Inspect saved database entitlement rows and compare with `excel_member_export`
- [x] Identify why the two keys are dropped, overwritten, or not reloaded
- [x] Apply the smallest safe fix preserving both true and false values
- [x] Verify all four true/false combinations on a safe test plan at database/runtime level
- [x] Verify reload/read path returns saved checkbox values
- [x] Run validation and report root cause, files changed, and test results

## Acceptance
`excel_member_import` and `bulk_member_removal` persist correctly after Push Plan and reload for all true/false combinations. Runtime entitlement resolution matches the saved values. Other entitlements remain unchanged.