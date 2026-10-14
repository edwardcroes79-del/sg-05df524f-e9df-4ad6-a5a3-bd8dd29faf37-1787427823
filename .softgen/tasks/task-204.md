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
Implemented Phase 4 on the existing Registered Customers page: separate Reconcile Members workflow beside Export to Excel and Import from Excel. Existing export/import behavior remains unchanged. Inspection confirmed the UI component, preview API, confirmation API, parser option, owner authorization, selected-program business isolation, reversible membership-status removal, and history/profile preservation already exist. The concrete blocker was live configuration: `plan_entitlements` had no `bulk_member_removal` rows, so the Customers page hid the Reconcile Members button and users were left in the Import workflow. Seeded only the existing Corporate/Enterprise entitlement target from `supabase/migrations/20261014170500_bulk_member_removal_entitlement.sql`. No customer data, memberships, stamps, rewards, transactions, prices, or deployment were modified.

## Checklist
- [x] Inspect Customers page, Excel export/import APIs, reconciliation files, schema relationships, and authorization helpers
- [x] Verify or add separate Reconcile Members button beside Export to Excel and Import from Excel
- [x] Verify or add server-side owner authorization, selected-program ownership, business isolation, and `bulk_member_removal` entitlement enforcement
- [x] Compare uploaded valid members against current selected-program memberships using verified stable identifiers
- [x] Preselect only safe missing memberships, flag duplicates/invalid/ambiguous rows, and support valid headers-only workbook warnings
- [x] Require explicit confirmation and remove only selected program membership associations without deleting profiles/history/other memberships
- [x] Run static validation and safe non-mutating preview checks
- [x] Report changed files, actual tests run, remaining risks, and manual test steps

## Acceptance
Registered Customers shows a separate Reconcile Members action beside export/import for entitled owners. Import Members behavior remains unchanged. Previewing reconciliation proposes missing selected-program memberships without mutating data, and confirmation only removes selected membership associations after explicit owner confirmation.