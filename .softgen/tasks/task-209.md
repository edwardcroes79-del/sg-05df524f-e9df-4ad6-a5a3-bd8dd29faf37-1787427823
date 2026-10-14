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
The Import from Excel button remains missing after the entitlement resolver fix. The existing Import from Excel workflow and APIs still exist, and the Customers page contains the original import dialog, `resetImportWorkflow()`, `setImportDialogOpen(true)`, preview, duplicate detection, validation, and confirmation handlers. Current scope: inspect the exact `canImportMembers` condition, live entitlement value for the logged-in/resolved business, business resolution logic, toolbar rendering, stale state, and responsive layout. Completion requires the original Import from Excel button to be visibly restored beside Export to Excel and Reconcile Members, and the existing dialog/workflow verified. Do not create a replacement importer, hardcode plan names, grant all businesses, alter customer data, or deploy.

## Checklist
- [ ] Inspect current Customers page toolbar and `canImportMembers` gating
- [ ] Verify whether the resolver migration is applied in the relevant environment
- [ ] Inspect the actual entitlement value returned for the resolved business
- [ ] Identify the remaining conditional-rendering, entitlement, permission, stale-state, or layout cause
- [ ] Restore the original Import from Excel button beside Export and Reconcile
- [ ] Verify the button opens the existing import dialog via `resetImportWorkflow()` and `setImportDialogOpen(true)`
- [ ] Confirm import preview, validation, duplicate detection, and confirmation remain connected
- [ ] Confirm Export to Excel, Reconcile Members, search, VIP filtering, and responsive layout remain unchanged
- [ ] Run validation and report exact root cause, changed files, and test results

## Acceptance
The Customers page visibly shows Import from Excel for businesses whose resolved `excel_member_import` entitlement is true and keeps it hidden for businesses where it is false. Clicking the button opens the original import dialog and preserves the existing preview/confirm workflow.