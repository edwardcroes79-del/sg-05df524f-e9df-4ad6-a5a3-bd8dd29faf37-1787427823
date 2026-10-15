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
Investigate and fix an Excel import inconsistency: member `gipaxic150` / `gipaxic150@leafflip.com` was removed from a loyalty program using Reconcile Members and no longer appears on the Customers page, but Import from Excel preview labels the same row as Existing with "Membership already exists for the selected program." Inspection confirmed Reconcile Members does not delete profiles, history, or card rows; it updates `customer_loyalty_cards.status` from `active` to `removed`. The schema also has a unique constraint on `(customer_id, loyalty_program_id)`, so a removed historical row still blocks a new insert for the same customer/program. Root cause: `findExistingMemberships` in `src/lib/server/memberImport.ts` treated any customer/program card row as existing without requiring `status = "active"`. Fix: preview duplicate detection now counts only active selected-program memberships, and confirmation revalidates current membership state. If a matching active membership exists, it is skipped as Existing. If a matching inactive/removed membership exists, confirmation safely reactivates that existing row to `active` instead of inserting a duplicate, preserving historical stamps, rewards, transactions, and the customer profile. No schema/customer/history deletion or unrelated changes.

## Checklist
- [x] Inspect import preview API and duplicate detection logic
- [x] Inspect import confirm API and server-side duplicate/re-add behavior
- [x] Inspect Reconcile Members removal logic and membership status behavior
- [x] Inspect schema and actual data for `gipaxic150`
- [x] Identify why removed membership is treated as active/existing during import
- [x] Fix preview duplicate detection to count only active selected-program memberships
- [x] Fix confirmation to revalidate active membership state and re-add removed memberships safely
- [ ] Verify active members remain Existing and removed members can be imported again
- [ ] Run validation and report root cause, changed files/migrations, and test results

## Acceptance
An active existing member is still detected as Existing. A reconciled/removed member can be imported again without deleting history or creating duplicate active memberships. Re-importing after successful import is again detected as Existing.