---
title: Excel Import Count Consistency
status: in_progress
priority: urgent
type: bug
tags: [customers, import, reconciliation, memberships]
created_by: agent
created_at: 2026-10-15T00:44:42Z
position: 213
---

## Notes
Investigated a discrepancy after exporting members and importing the same Excel file. Import preview showed `gipaxic150` / `gipaxic150@leafflip.com` as Valid and `edwardcroes79` / `edwardcroes79@gmail.com` as Existing, but the Customers page afterward displays only `edwardcroes79`, count 1, and `gipaxic150` is not visible. Database inspection for Test 13 Oct / Loyalty Rewards confirmed `gipaxic150` has a preserved `customer_loyalty_cards` row with `status = "removed"` and zero active rows, while `edwardcroes79` has an active row. A rollback-only reactivation test confirmed the removed row can be safely reactivated, so import confirmation can restore it when confirmation actually runs. Root cause of the export/import count discrepancy: the Customers page count and list correctly filter `customer_loyalty_cards.status = "active"`, but `src/pages/api/business/member-export.ts` exported all business membership rows regardless of status. That allowed reconciled/removed members to appear in the exported "member list" even though they were intentionally excluded from Customers. Fix: member export now counts and fetches only active membership rows, matching the Customers list/count semantics. Existing import preview/confirmation behavior remains: active members are Existing, removed members can be reactivated through confirm, and historical rows are preserved.

## Checklist
- [x] Inspect actual database state for `gipaxic150` and `edwardcroes79`
- [x] Inspect import preview API and server duplicate/status detection
- [x] Inspect import confirm API and reactivation/creation behavior
- [x] Inspect Customers page row/count query and membership status filters
- [x] Inspect reconciliation removal behavior for removed memberships
- [x] Identify where the member is lost between preview, confirmation, database state, and display
- [x] Apply the smallest safe fix preserving history, isolation, and duplicate protection
- [ ] Verify new + existing import behavior, count/list consistency, export inclusion, and re-import protection
- [ ] Run validation and report root cause, changed files, and test results

## Acceptance
A file containing one new or removed-then-readded member and one active existing member previews accurately, confirms accurately, shows the imported member in Customers, keeps counts aligned with visible active memberships, exports expected active memberships, and prevents duplicate active memberships on re-import.