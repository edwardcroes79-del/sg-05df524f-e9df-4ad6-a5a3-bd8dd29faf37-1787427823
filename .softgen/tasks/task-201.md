---
title: Customers Reconcile Members Workflow
status: todo
priority: high
type: feature
tags: [customers, ui, excel, reconciliation]
created_by: agent
created_at: 2026-10-14T16:58:09Z
position: 201
---

## Notes
Add a focused Reconcile Members action to the existing Customers page without rebuilding the page. Workflow: select target loyalty program, upload edited .xlsx export, preview differences, show retained/current/missing/duplicate/invalid/ambiguous outcomes, allow Owner to deselect proposed removals, show exact removal count, require explicit confirmation, and display removed/retained/skipped/failed counts. UI gating is convenience only; security must remain server-side.

## Checklist
- [ ] Inspect existing Customers page patterns for program selection, export/import controls, API calls, toasts, and modals
- [ ] Add Reconcile Members action using existing styling and state patterns
- [ ] Show preview sections and automatically selected safe removal candidates
- [ ] Allow deselecting proposed removals and require explicit confirmation text/action
- [ ] Display final counts and preserve existing Export/Import behavior

## Acceptance
Business Owners can complete the reconcile preview and confirmation flow from the Customers page. Uploading/previewing never removes memberships. Existing customer tools still work.