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
The Import from Excel button is visible again but greyed out and does not open the import dialog. In the current `src/pages/dashboard/customers.tsx`, the button's exact disabled condition is `previewingImport || confirmingImport || !canImportMembers`, and the click handler also blocks when `canImportMembers` is false. The existing import workflow still exists in the file: `resetImportWorkflow()`, `setImportDialogOpen(true)`, import dialog, file selector, target program selector, preview handler, duplicate/status rows, and confirm handler. Current scope: fix the confirmed cause so authorized businesses with `excel_member_import = true` can click the restored original button, while businesses without the entitlement remain restricted by existing server-side import APIs. Do not create a replacement importer, hardcode business names, grant all plans, modify customer data, or deploy.

## Checklist
- [x] Inspect current disabled condition and click handler
- [ ] Trace why `canImportMembers` remains false/stale for an authorized business
- [ ] Restore clickable button behavior for authorized businesses
- [ ] Preserve unauthorized restriction and server-side import authorization
- [ ] Verify the button opens the existing import dialog using `resetImportWorkflow()` and `setImportDialogOpen(true)`
- [ ] Verify preview, validation, duplicate detection, and confirm workflow remain connected
- [ ] Confirm Export to Excel and Reconcile Members remain unchanged
- [ ] Run validation and report exact cause, files changed, and test evidence

## Acceptance
Authorized businesses can click Import from Excel and open the original import dialog. Unauthorized businesses cannot complete the import workflow. Existing preview/confirm import APIs remain unchanged.