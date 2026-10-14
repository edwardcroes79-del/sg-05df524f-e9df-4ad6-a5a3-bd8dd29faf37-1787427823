---
title: Customers Import Button Regression
status: done
priority: urgent
type: bug
tags: [customers, excel, import, entitlement]
created_by: agent
created_at: 2026-10-14T20:46:43Z
position: 209
---

## Notes
Fixed the missing Import from Excel button by correcting the runtime entitlement resolver path. Confirmed diagnosis: the existing Import from Excel workflow and APIs still exist, and the Customers page correctly hides the button when `excel_member_import` resolves to false. Root cause: Botica Benu had the saved plan setting enabled (`excel_member_import = true` on `mega_plan`) while the runtime resolver returned false, causing the authorized import button to be hidden. There is no supported business-level override table in the inspected schema, so the smallest safe fix was a resolver-only SQL update that evaluates the existing `businesses.subscription_plan -> plan_entitlements` boolean rule while preserving active subscription/contract restrictions. No plan names were hardcoded, no global entitlement grant was added, and no import UI/API replacement was created. The Customers page remains wired to the existing `resetImportWorkflow()` / `setImportDialogOpen(true)` flow and the existing `member-import-preview`, `member-import-confirm`, and `memberImport.ts` workflow. Verification showed Botica Benu now resolves `excel_member_import = true`, while businesses with saved false plan values still resolve false. Export and reconciliation entitlement checks were included in verification and remain separate. `check_for_errors` passed. No customer data, schema tables, import APIs, production configuration, unrelated features, or deployment were changed.

## Checklist
- [x] Inspect Customers page `canImportMembers` gating and import dialog wiring
- [x] Inspect live `get_business_boolean_entitlement` implementation and entitlement tables
- [x] Identify why runtime result contradicts saved `excel_member_import` plan configuration
- [x] Apply the smallest resolver/query fix without hardcoding plan names or granting all businesses
- [x] Verify authorized businesses resolve `excel_member_import = true`
- [x] Verify non-authorized businesses still resolve `excel_member_import = false`
- [x] Verify supported business-level override behavior if present
- [x] Confirm import preview/confirm APIs remain wired and export/reconciliation unaffected
- [x] Run validation and report root cause, changed files, and test results

## Acceptance
Businesses with `excel_member_import` enabled by the established entitlement rules see the existing Import from Excel button. Businesses without the entitlement do not. The existing import preview, duplicate detection, validation, and confirmation workflow remains unchanged.