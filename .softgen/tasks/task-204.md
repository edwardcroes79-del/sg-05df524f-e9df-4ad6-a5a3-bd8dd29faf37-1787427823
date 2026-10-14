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
Implemented Phase 4 on the existing Registered Customers page: separate Reconcile Members workflow beside Export to Excel and Import from Excel. Existing export/import behavior remains unchanged. Inspection confirmed the UI component, preview API, confirmation API, parser option, owner authorization, selected-program business isolation, reversible membership-status removal, and history/profile preservation already exist. A new preview bug is reported: an edited Royalty Stamp export for selected program Loyalty Rewards is blocked with "This workbook does not contain rows for the selected loyalty program, so reconciliation is blocked." Diagnose the parser/export/program matching logic and fix only the confirmed cause. Do not change Import Members, Export to Excel, unrelated entitlements, production data, or deployment.

## Checklist
- [x] Inspect Customers page, Excel export/import APIs, reconciliation files, schema relationships, and authorization helpers
- [x] Verify or add separate Reconcile Members button beside Export to Excel and Import from Excel
- [x] Verify or add server-side owner authorization, selected-program ownership, business isolation, and `bulk_member_removal` entitlement enforcement
- [x] Compare uploaded valid members against current selected-program memberships using verified stable identifiers
- [x] Preselect only safe missing memberships, flag duplicates/invalid/ambiguous rows, and support valid headers-only workbook warnings
- [x] Require explicit confirmation and remove only selected program membership associations without deleting profiles/history/other memberships
- [ ] Diagnose why edited export rows are not recognized for the selected loyalty program
- [ ] Fix only the confirmed selected-program matching cause
- [ ] Validate static checks and safe non-mutating preview behavior

## Acceptance
Registered Customers shows a separate Reconcile Members action beside export/import for entitled owners. Import Members behavior remains unchanged. Previewing reconciliation proposes missing selected-program memberships without mutating data, and confirmation only removes selected membership associations after explicit owner confirmation.