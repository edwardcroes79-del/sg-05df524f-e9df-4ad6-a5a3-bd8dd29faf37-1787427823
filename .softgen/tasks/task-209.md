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
The Import from Excel button still remains missing in the running Royalty Stamp Customers page after previous entitlement and business-resolution fixes. The current file confirms the original import workflow still exists: `resetImportWorkflow()`, `setImportDialogOpen(true)`, the import dialog, preview, validation, duplicate status rows, and confirm handlers are present in `src/pages/dashboard/customers.tsx`. Implement the smallest direct restoration now: the toolbar must render the original Import from Excel action beside Export to Excel and Reconcile Members, while the existing workflow remains enabled only when `canImportMembers` is true and server-side import APIs continue enforcing authorization. Do not create a replacement importer, hardcode business names, grant every plan access, modify customer data, or deploy.

## Checklist
- [x] Open and inspect current Customers page toolbar JSX and Import from Excel render condition
- [x] Trace runtime `excel_member_import` from resolver through frontend state to button visibility
- [x] Verify resolver migration is applied in the tested environment
- [x] Identify the exact remaining cause and why prior fixes did not restore the button
- [ ] Restore the original Import from Excel button beside Export and Reconcile using existing handlers
- [ ] Confirm true-entitlement businesses render the enabled button and false-entitlement businesses cannot use it
- [ ] Verify button opens the existing import dialog and preview/duplicate/confirm flow remains connected
- [ ] Confirm Export to Excel and Reconcile Members remain unchanged
- [ ] Run validation and report exact root cause, changed files, test evidence, and deployment steps if any

## Acceptance
The Customers page visibly shows Import from Excel in the toolbar. Businesses whose resolved `excel_member_import` entitlement is true can open the original import dialog. Businesses without the entitlement cannot use the import workflow. The existing preview/confirm workflow remains unchanged.