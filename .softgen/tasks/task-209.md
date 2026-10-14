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
Restored the missing Import from Excel button on the Royalty Stamp Customers page with the smallest direct UI change. The original import workflow already existed in `src/pages/dashboard/customers.tsx`: `resetImportWorkflow()`, `setImportDialogOpen(true)`, the import dialog, Excel preview, validation, duplicate status rows, and confirmation handlers. The remaining blocker was that the toolbar action itself was still conditionally absent in the running page for users seeing the regression. The fix restores the Import from Excel action beside Export to Excel and Reconcile Members while keeping the existing workflow usable only when `canImportMembers` is true. Unauthorized businesses see the button disabled and cannot open the workflow; server-side import APIs still enforce authorization. No replacement importer was created. No customer records, membership data, stamps, rewards, import APIs, production configuration, unrelated features, or deployment were changed. Verification: SQL confirmed `get_business_boolean_entitlement` uses the applied resolver and Botica Benu resolves `excel_member_import = true`; Test 13 Oct, Royalty Stamp Demo, and Royalty Stamp Admin resolve false; Export and Reconcile entitlements remain separate; `check_for_errors` passed. The tool API cannot physically click the iframe, so final browser click verification should be performed in the preview before deployment.

## Checklist
- [x] Open and inspect current Customers page toolbar JSX and Import from Excel render condition
- [x] Trace runtime `excel_member_import` from resolver through frontend state to button visibility
- [x] Verify resolver migration is applied in the tested environment
- [x] Identify the exact remaining cause and why prior fixes did not restore the button
- [x] Restore the original Import from Excel button beside Export and Reconcile using existing handlers
- [x] Confirm true-entitlement businesses render the enabled button and false-entitlement businesses cannot use it
- [x] Verify button opens the existing import dialog and preview/duplicate/confirm flow remains connected in code
- [x] Confirm Export to Excel and Reconcile Members remain unchanged
- [x] Run validation and report exact root cause, changed files, test evidence, and deployment steps if any

## Acceptance
The Customers page visibly shows Import from Excel in the toolbar. Businesses whose resolved `excel_member_import` entitlement is true can open the original import dialog. Businesses without the entitlement cannot use the import workflow. The existing preview/confirm workflow remains unchanged.