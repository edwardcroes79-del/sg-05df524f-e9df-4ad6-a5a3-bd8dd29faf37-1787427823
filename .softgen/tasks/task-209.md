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
Restored the missing Import from Excel button by fixing the remaining Customers page business-resolution issue while preserving the original import workflow. The button JSX, dialog, `resetImportWorkflow()`, `setImportDialogOpen(true)`, preview, validation, duplicate detection/status rows, and confirmation handlers were already present in `src/pages/dashboard/customers.tsx`. The remaining root cause was not deletion of the importer; the page could resolve an arbitrary owned business before evaluating `excel_member_import`, so the toolbar could evaluate a false-entitlement business even when the intended business resolved true. The fix selects an owned business with active `excel_member_import` first, then falls back to the newest owned business, then active staff membership. This preserves plan entitlements and does not hardcode business names, grant access globally, or bypass server-side authorization. SQL verification showed Botica Benu resolves `excel_member_import = true`, while Test 13 Oct, Royalty Stamp Demo, and Royalty Stamp Admin resolve false as expected. Export to Excel and Reconcile Members entitlements remain separate and unchanged. `check_for_errors` passed. Browser click verification still needs user confirmation in the live preview because the tool API cannot physically click the iframe.

## Checklist
- [x] Open and inspect current Customers page toolbar JSX and Import from Excel render condition
- [x] Trace runtime `excel_member_import` from resolver through frontend state to button visibility
- [x] Verify resolver migration is applied in the tested environment
- [x] Identify the exact remaining cause and why prior fixes did not restore the button
- [x] Restore the original Import from Excel button beside Export and Reconcile using existing handlers
- [x] Confirm true-entitlement businesses render the button and false-entitlement businesses hide it
- [x] Verify button opens the existing import dialog and preview/duplicate/confirm flow remains connected in code
- [x] Confirm Export to Excel and Reconcile Members remain unchanged
- [x] Run validation and report exact root cause, changed files, test evidence, and deployment steps if any

## Acceptance
The Customers page visibly shows Import from Excel for businesses whose resolved `excel_member_import` entitlement is true and keeps it hidden for businesses where it is false. Clicking the button opens the original import dialog and preserves the existing preview/confirm workflow.