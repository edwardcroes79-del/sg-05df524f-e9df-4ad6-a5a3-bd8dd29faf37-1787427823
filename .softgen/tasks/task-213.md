---
title: Excel Import Count Consistency
status: done
priority: urgent
type: bug
tags: [customers, import, reconciliation, memberships]
created_by: agent
created_at: 2026-10-15T00:44:42Z
position: 213
---

## Notes
Fixed the export/import/count discrepancy after exporting members and importing the same Excel file. Import preview showed `gipaxic150` / `gipaxic150@leafflip.com` as Valid and `edwardcroes79` / `edwardcroes79@gmail.com` as Existing, but the Customers page afterward displayed only `edwardcroes79`, count 1, with `gipaxic150` not visible. Database inspection for Test 13 Oct / Loyalty Rewards confirmed `gipaxic150` has a preserved `customer_loyalty_cards` row with `status = "removed"` and zero active rows, while `edwardcroes79` has one active row. A rollback-only reactivation test confirmed the removed row can be safely reactivated by import confirmation when confirmation actually runs. Root cause: the Customers page count/list correctly filter `customer_loyalty_cards.status = "active"`, but `src/pages/api/business/member-export.ts` exported all business membership rows regardless of status. That allowed reconciled/removed members to appear in the exported "member list" even though they were intentionally excluded from Customers. Fix: member export now counts and fetches only active membership rows, matching Customers list/count semantics. Existing import preview/confirmation behavior remains: active members are Existing, removed members can be reactivated through confirm, and historical rows are preserved. Verification SQL showed Loyalty Rewards has `active: 1` and `removed: 1`; target rows are `edwardcroes79@gmail.com:active = 1` and `gipaxic150@leafflip.com:removed = 1`; Customers count and fixed export count both equal 1 while historical rows remain 2. `check_for_errors` passed. No schema changes, migrations, customer data edits, membership rewrites, stamps, rewards, transactions, unrelated features, or deployment changes were made.

## Checklist
- [x] Inspect actual database state for `gipaxic150` and `edwardcroes79`
- [x] Inspect import preview API and server duplicate/status detection
- [x] Inspect import confirm API and reactivation/creation behavior
- [x] Inspect Customers page row/count query and membership status filters
- [x] Inspect reconciliation removal behavior for removed memberships
- [x] Identify where the member is lost between preview, confirmation, database state, and display
- [x] Apply the smallest safe fix preserving history, isolation, and duplicate protection
- [x] Verify new + existing import behavior, count/list consistency, export inclusion, and re-import protection
- [x] Run validation and report root cause, changed files, and test results

## Acceptance
A file containing one new or removed-then-readded member and one active existing member previews accurately, confirms accurately, shows the imported member in Customers after confirmation, keeps counts aligned with visible active memberships, exports expected active memberships, and prevents duplicate active memberships on re-import.