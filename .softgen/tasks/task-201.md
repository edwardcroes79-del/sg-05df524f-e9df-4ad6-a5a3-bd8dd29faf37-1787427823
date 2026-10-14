---
title: Customers Reconcile Members Workflow
status: done
priority: high
type: feature
tags: [customers, excel, dashboard]
created_by: agent
created_at: 2026-10-14T17:07:23Z
position: 201
---

## Notes
Added a Customers page Reconcile Members action gated by the `bulk_member_removal` entitlement. The dialog requires a target program and `.xlsx` upload, previews proposed removals, preselects only safe candidates, lets the owner deselect rows, requires exact confirmation text, and reports final counts.

## Checklist
- [x] Add Customers page entitlement check for `bulk_member_removal`
- [x] Add Reconcile Members action without changing existing export/import actions
- [x] Add upload/program selection workflow
- [x] Show current, retained, proposed removal, skipped, and row issue counts
- [x] Allow deselection and require exact `REMOVE n` confirmation
- [x] Refresh Customers page after confirmation and exclude reversibly removed memberships from active counts/list

## Acceptance
Owners with entitlement can reconcile members from the Customers page. Uploading/previewing never removes memberships. Existing customer import/export controls remain intact.