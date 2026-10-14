---
title: Registered Customers Reconcile Members
status: done
priority: urgent
type: feature
tags: [customers, reconciliation, excel, entitlement]
created_by: agent
created_at: 2026-10-14T18:54:17Z
position: 204
---

## Notes
Implemented Phase 4 on the existing Registered Customers page: separate Reconcile Members workflow beside Export to Excel and Import from Excel. Existing export/import behavior remains unchanged. Inspection confirmed the UI component, preview API, confirmation API, parser option, owner authorization, selected-program business isolation, reversible membership-status removal, and history/profile preservation already exist. Fixed the reported preview bug where an edited Royalty Stamp export for selected program Loyalty Rewards was blocked with "This workbook does not contain rows for the selected loyalty program, so reconciliation is blocked." Exact cause: reconciliation required the exported Loyalty Program display label to match the selected program before stable membership matching. The fix matches uploaded rows to current selected-program memberships by verified email/phone first, then keeps the wrong-program safety block only when no selected-program membership is retained and no selected-program label exists. Do not change Import Members, Export to Excel, unrelated entitlements, production data, or deployment.

## Checklist
- [x] Inspect Customers page, Excel export/import APIs, reconciliation files, schema relationships, and authorization helpers
- [x] Verify or add separate Reconcile Members button beside Export to Excel and Import from Excel
- [x] Verify or add server-side owner authorization, selected-program ownership, business isolation, and `bulk_member_removal` entitlement enforcement
- [x] Compare uploaded valid members against current selected-program memberships using verified stable identifiers
- [x] Preselect only safe missing memberships, flag duplicates/invalid/ambiguous rows, and support valid headers-only workbook warnings
- [x] Require explicit confirmation and remove only selected program membership associations without deleting profiles/history/other memberships
- [x] Diagnose why edited export rows are not recognized for the selected loyalty program
- [x] Fix only the confirmed selected-program matching cause
- [x] Validate static checks and safe non-mutating preview behavior

## Acceptance
Registered Customers shows a separate Reconcile Members action beside export/import for entitled owners. Import Members behavior remains unchanged. Previewing reconciliation proposes missing selected-program memberships without mutating data, and confirmation only removes selected membership associations after explicit owner confirmation.