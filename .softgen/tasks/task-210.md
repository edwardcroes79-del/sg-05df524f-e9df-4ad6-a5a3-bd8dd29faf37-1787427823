---
title: Removed Member Import Eligibility
status: in_progress
priority: urgent
type: bug
tags: [customers, import, reconciliation, memberships]
created_by: agent
created_at: 2026-10-15T00:01:53Z
position: 210
---

## Notes
Investigate and fix an Excel import inconsistency: member `gipaxic150` / `gipaxic150@leafflip.com` was removed from a loyalty program using Reconcile Members and no longer appears on the Customers page, but Import from Excel preview labels the same row as Existing with "Membership already exists for the selected program." Scope: inspect import preview/confirm APIs, `memberImport.ts`, Reconcile Members removal logic, membership status schema, and actual data. Fix duplicate detection so it matches the app definition of a current active membership in the selected business/program. Removed/inactive memberships should be re-addable through the existing import workflow if validation and authorization pass. Preserve customer profiles, historical stamps, rewards, transactions, business isolation, and duplicate protection for genuinely active memberships. Revalidate during confirmation, not preview only. No unrelated changes, production deployment, or destructive data changes.

## Checklist
- [ ] Inspect import preview API and duplicate detection logic
- [ ] Inspect import confirm API and server-side duplicate/re-add behavior
- [ ] Inspect Reconcile Members removal logic and membership status behavior
- [ ] Inspect schema and actual data for `gipaxic150`
- [ ] Identify why removed membership is treated as active/existing during import
- [ ] Fix preview duplicate detection to count only active selected-program memberships
- [ ] Fix confirmation to revalidate active membership state and re-add removed memberships safely
- [ ] Verify active members remain Existing and removed members can be imported again
- [ ] Run validation and report root cause, changed files/migrations, and test results

## Acceptance
An active existing member is still detected as Existing. A reconciled/removed member can be imported again without deleting history or creating duplicate active memberships. Re-importing after successful import is again detected as Existing.