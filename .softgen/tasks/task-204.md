---
title: Registered Customers Reconcile Members
status: in_progress
priority: urgent
type: feature
tags: [customers, reconciliation, excel, entitlement]
created_by: agent
created_at: 2026-10-14T18:54:17Z
position: 204
---

## Notes
Implement Phase 4 on the existing Registered Customers page: add a separate Reconcile Members workflow beside Export to Excel and Import from Excel. Keep existing export/import unchanged. Reconciliation must compare a valid Royalty Stamp export workbook against current memberships in a selected loyalty program, preselect memberships missing from the uploaded list, allow deselection, warn on exact removal count including valid headers-only workbooks, require explicit confirmation, and remove only selected program membership associations while preserving profiles/history/other memberships. Enforce Owner authorization, business isolation, selected-program ownership, and `bulk_member_removal` entitlement server-side. Do not modify production customer data or deploy.

## Checklist
- [ ] Inspect Customers page, Excel export/import APIs, reconciliation files, schema relationships, and authorization helpers
- [ ] Verify or add separate Reconcile Members button beside Export to Excel and Import from Excel
- [ ] Verify or add server-side owner authorization, selected-program ownership, business isolation, and `bulk_member_removal` entitlement enforcement
- [ ] Compare uploaded valid members against current selected-program memberships using verified stable identifiers
- [ ] Preselect only safe missing memberships, flag duplicates/invalid/ambiguous rows, and support valid headers-only workbook warnings
- [ ] Require explicit confirmation and remove only selected program membership associations without deleting profiles/history/other memberships
- [ ] Run static validation and safe non-mutating preview checks
- [ ] Report changed files, actual tests run, remaining risks, and manual test steps

## Acceptance
Registered Customers shows a separate Reconcile Members action beside export/import for entitled owners. Import Members behavior remains unchanged. Previewing reconciliation proposes missing selected-program memberships without mutating data, and confirmation only removes selected membership associations after explicit owner confirmation.