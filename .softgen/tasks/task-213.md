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
Investigate and fix a discrepancy after exporting members and importing the same Excel file. Import preview showed `gipaxic150` / `gipaxic150@leafflip.com` as Valid and `edwardcroes79` / `edwardcroes79@gmail.com` as Existing, but the Customers page afterward displays only `edwardcroes79`, count 1, and `gipaxic150` is not visible. Determine whether preview was correct but confirmation failed, whether confirmation restored/created an active membership that the Customers query excludes, whether the membership remains removed/inactive, whether count and row filters differ, or whether pagination/stale state explains the mismatch. Fix the smallest root cause so import preview, confirmation, active membership detection, Customers list/count, export, and reconciliation semantics agree without deleting history or creating duplicate active memberships.

## Checklist
- [ ] Inspect actual database state for `gipaxic150` and `edwardcroes79`
- [ ] Inspect import preview API and server duplicate/status detection
- [ ] Inspect import confirm API and reactivation/creation behavior
- [ ] Inspect Customers page row/count query and membership status filters
- [ ] Inspect reconciliation removal behavior for removed memberships
- [ ] Identify where the member is lost between preview, confirmation, database state, and display
- [ ] Apply the smallest safe fix preserving history, isolation, and duplicate protection
- [ ] Verify new + existing import behavior, count/list consistency, export inclusion, and re-import protection
- [ ] Run validation and report root cause, changed files, and test results

## Acceptance
A file containing one new or removed-then-readded member and one active existing member previews accurately, confirms accurately, shows the imported member in Customers, keeps counts aligned with visible active memberships, exports expected active memberships, and prevents duplicate active memberships on re-import.