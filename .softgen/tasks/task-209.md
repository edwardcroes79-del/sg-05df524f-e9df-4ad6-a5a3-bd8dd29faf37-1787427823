---
title: Customers Import Button Regression
status: in_progress
priority: urgent
type: bug
tags: [customers, excel, import, entitlement]
created_by: agent
created_at: 2026-10-14T20:46:43Z
position: 209
---

## Notes
Confirmed diagnosis: the existing Import from Excel workflow and APIs still exist, but the Customers page hides the button when `excel_member_import` resolves to false. Botica Benu has the saved plan setting enabled while the runtime entitlement check returns false, so the next fix must inspect and correct the entitlement resolver rather than creating a new importer or granting the feature globally. Scope: inspect `src/pages/dashboard/customers.tsx`, the actual `get_business_boolean_entitlement("excel_member_import")` implementation/database function, plan configuration, any business-level override rules, caching/default behavior, and related import APIs. Preserve Super Admin control, subscription restrictions, export, reconciliation, and the existing import dialog/API workflow. No unrelated schema/data/config changes and no deployment.

## Checklist
- [ ] Inspect Customers page `canImportMembers` gating and import dialog wiring
- [ ] Inspect live `get_business_boolean_entitlement` implementation and entitlement tables
- [ ] Identify why runtime result contradicts saved `excel_member_import` plan configuration
- [ ] Apply the smallest resolver/query fix without hardcoding plan names or granting all businesses
- [ ] Verify authorized businesses resolve `excel_member_import = true`
- [ ] Verify non-authorized businesses still resolve `excel_member_import = false`
- [ ] Verify supported business-level override behavior if present
- [ ] Confirm import preview/confirm APIs remain wired and export/reconciliation unaffected
- [ ] Run validation and report root cause, changed files, and test results

## Acceptance
Businesses with `excel_member_import` enabled by the established entitlement rules see the existing Import from Excel button. Businesses without the entitlement do not. The existing import preview, duplicate detection, validation, and confirmation workflow remains unchanged.