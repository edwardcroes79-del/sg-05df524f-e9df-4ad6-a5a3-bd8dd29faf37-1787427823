---
title: Customers Import Button Regression
status: done
priority: urgent
type: bug
tags: [customers, excel, import, toolbar]
created_by: agent
created_at: 2026-10-14T20:46:43Z
position: 209
---

## Notes
Fixed the missing Import from Excel button on the Royalty Stamp Customers page. Root cause: the existing import button and import dialog/workflow were still present, but the toolbar action group did not wrap while action buttons used `whitespace-nowrap`, allowing Import from Excel to be pushed out of the visible toolbar after VIP and Reconcile controls were added. The smallest safe fix was to allow the toolbar action group to wrap on responsive layouts. No database schemas, customer records, membership data, import APIs, VIP logic, reconciliation logic, or deployment were changed. `check_for_errors` passed. The button still opens the existing import interface through the existing `resetImportWorkflow()` and `setImportDialogOpen(true)` path; no replacement importer was created.

## Checklist
- [x] Inspect current Customers page toolbar and recent Excel-import rendering logic
- [x] Identify why Import from Excel is no longer rendered
- [x] Restore the existing Import from Excel button using the existing import workflow
- [x] Preserve Export to Excel, Reconcile Members, search, VIP filtering, and responsive layout
- [x] Verify authorized visibility matches the previous import access behavior
- [x] Run available checks and report root cause, changed files, and workflow test status

## Acceptance
The Customers page shows Import from Excel beside Export to Excel and Reconcile Members. Clicking it opens the existing Excel import interface. Existing preview, duplicate detection, validation, and confirmation workflow remains unchanged.