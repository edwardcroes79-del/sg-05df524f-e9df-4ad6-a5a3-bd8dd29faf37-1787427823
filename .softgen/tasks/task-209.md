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
The Import from Excel button still remains missing after previous attempted fixes. Current required scope: inspect the actual current `src/pages/dashboard/customers.tsx` toolbar JSX and complete render condition; trace `excel_member_import` from the live resolver through frontend state to the visibility condition; verify whether `20261014210200_fix_excel_import_entitlement_resolver.sql` is applied in the environment; identify why prior fixes did not restore the button; then implement the smallest verified code fix. The existing Import from Excel workflow must be restored, not replaced: use the existing button/dialog/handlers, including `resetImportWorkflow()` and `setImportDialogOpen(true)`. Preserve plan entitlements, Super Admin controls, import APIs, export, reconciliation, VIP, customer data, and server-side authorization. Completion requires visible button restoration and import dialog verification, not just SQL/build checks.

## Checklist
- [ ] Open and inspect current Customers page toolbar JSX and Import from Excel render condition
- [ ] Trace runtime `excel_member_import` from resolver through frontend state to button visibility
- [ ] Verify resolver migration is applied in the tested environment
- [ ] Identify the exact remaining cause and why prior fixes did not restore the button
- [ ] Restore the original Import from Excel button beside Export and Reconcile using existing handlers
- [ ] Confirm true-entitlement businesses render the button and false-entitlement businesses hide it
- [ ] Verify button opens the existing import dialog and preview/duplicate/confirm flow remains connected
- [ ] Confirm Export to Excel and Reconcile Members remain unchanged
- [ ] Run validation and report exact root cause, changed files, test evidence, and deployment steps if any

## Acceptance
The Customers page visibly shows Import from Excel for businesses whose resolved `excel_member_import` entitlement is true and keeps it hidden for businesses where it is false. Clicking the button opens the original import dialog and preserves the existing preview/confirm workflow.