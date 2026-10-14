---
title: Customers Import Button Regression
status: in_progress
priority: urgent
type: bug
tags: [customers, excel, import, toolbar]
created_by: agent
created_at: 2026-10-14T20:46:43Z
position: 209
---

## Notes
Fix the missing Import from Excel button on the Royalty Stamp Customers page. The existing import workflow must be restored beside Export to Excel and Reconcile Members. Inspect the current Customers page toolbar and existing Excel import state/dialog/handlers before editing. Make the smallest possible change. Preserve Export to Excel, Reconcile Members, customer search, VIP filtering, responsive layout, and all existing server-side authorization. Do not change database schemas, customer records, membership data, import APIs, VIP functionality, or unrelated customer management features. No deployment.

## Checklist
- [ ] Inspect current Customers page toolbar and recent Excel-import rendering logic
- [ ] Identify why Import from Excel is no longer rendered
- [ ] Restore the existing Import from Excel button using the existing import workflow
- [ ] Preserve Export to Excel, Reconcile Members, search, VIP filtering, and responsive layout
- [ ] Verify authorized visibility matches the previous import access behavior
- [ ] Run available checks and report root cause, changed files, and workflow test status

## Acceptance
The Customers page shows Import from Excel beside Export to Excel and Reconcile Members. Clicking it opens the existing Excel import interface. Existing preview, duplicate detection, validation, and confirmation workflow remains unchanged.