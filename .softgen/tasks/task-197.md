---
title: Customers Excel Import Workflow
status: todo
priority: high
type: feature
tags: [customers, import, excel, frontend]
created_by: agent
created_at: 2026-10-14T12:34:59Z
position: 197
---

## Notes
Add an Import from Excel workflow to the Business Admin Customers page beside Export to Excel. Frontend must use backend import APIs only and must not parse or import data as the source of truth. The workflow: upload `.xlsx`, validate and preview contents, show valid/invalid/duplicate/existing/ambiguous rows, require explicit confirmation, support cancellation with no changes, prevent duplicate submissions, and show final success/skipped/failed summary. Show the action only for businesses with saved `excel_member_import` entitlement. Preserve existing search, pagination, detail views, export behavior, responsive layout, and dashboard styling.

## Checklist
- [ ] Inspect current Customers page layout, export button implementation, toast/dialog components, and program selection data
- [ ] Add entitlement-gated Import from Excel button beside Export to Excel
- [ ] Add upload, program selection, preview, confirmation, cancellation, loading, and summary UI
- [ ] Handle empty/invalid/corrupted/malformed files, backend validation errors, network failures, unauthorized responses, and duplicate submissions
- [ ] Run checks and document UI behavior and manual test steps

## Acceptance
Entitled businesses see Import from Excel beside Export to Excel and can safely preview, confirm, cancel, and review import results. Non-entitled businesses do not see an enabled import action. Existing Customers page and Excel Export behavior continue working.