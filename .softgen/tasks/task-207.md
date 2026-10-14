---
title: Search Dropdown Membership Eligibility
status: in_progress
priority: urgent
type: bug
tags: [reconciliation, stamping, customers, permissions]
created_by: agent
created_at: 2026-10-14T20:08:13Z
position: 207
---

## Notes
Fix the Search Registered Customers dropdown after Excel Member Reconciliation. Observed issue: customer `gipaxic150` was removed from the selected Loyalty Rewards program through Reconcile Members, but still appears in the customer search dropdown on the Stamps & Rewards page. Inspect reconciliation removal logic, the actual customer-search query/RPC used by the stamping page, and the server-side Search & Send stamp submission path. Determine whether reconciliation deletes, deactivates, or retains the membership association because of history. Dropdown results and direct search-based stamp requests must require an active membership in the selected business and selected loyalty program. Preserve global customer profiles, historical stamps, rewards, transactions, and memberships in other programs/businesses. Do not change unrelated features or deploy.

## Checklist
- [ ] Inspect reconciliation removal logic and confirm whether memberships are deleted, deactivated, or retained
- [ ] Inspect stamping page customer-search query/RPC and selected-program filtering
- [ ] Inspect server-side Search & Send stamp API eligibility checks
- [ ] Determine actual membership state for `gipaxic150` without modifying data
- [ ] Fix dropdown search to return only active memberships in the selected business and selected loyalty program
- [ ] Revalidate active selected-program membership server-side before awarding search-based stamps
- [ ] Refresh or invalidate customer-search results after reconciliation succeeds where relevant
- [ ] Preserve profiles, history, rewards, transactions, and other program/business memberships
- [ ] Run static validation and safe non-destructive membership/search checks

## Acceptance
After reconciliation removes a member from the selected program, that customer no longer appears in Search Registered Customers for that program and direct search-based stamp requests are denied. Customers active in other programs/businesses remain preserved.