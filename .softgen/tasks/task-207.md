---
title: Search Dropdown Membership Eligibility
status: done
priority: urgent
type: bug
tags: [reconciliation, stamping, customers, permissions]
created_by: agent
created_at: 2026-10-14T20:08:13Z
position: 207
---

## Notes
Fixed the Search Registered Customers dropdown after Excel Member Reconciliation. Observed issue: customer `gipaxic150` was removed from the selected Loyalty Rewards program through Reconcile Members, but still appeared in the customer search dropdown on the Stamps & Rewards page. Inspection confirmed reconciliation preserves history by updating `customer_loyalty_cards.status` from `active` to `removed`; it does not delete the global customer profile or historical records. `gipaxic150` is not active in Test 13 Oct / Loyalty Rewards and remains active in another business/program, which is preserved. Root cause: the Search & Send customer-search RPC was business-wide and did not require the selected loyalty program or active selected-program membership. Implemented selected-program active-membership filtering in the search RPC, passed the selected program from the stamping page, cleared cached dropdown results on program changes, and added server-side active selected-program membership verification before search-based stamping. Safe SQL verification confirmed `gipaxic150_active_in_loyalty_rewards = false` and `gipaxic150_active_elsewhere = true`. `check_for_errors` passed. Do not change unrelated features or deploy.

## Checklist
- [x] Inspect reconciliation removal logic and confirm whether memberships are deleted, deactivated, or retained
- [x] Inspect stamping page customer-search query/RPC and selected-program filtering
- [x] Inspect server-side Search & Send stamp API eligibility checks
- [x] Determine actual membership state for `gipaxic150` without modifying data
- [x] Fix dropdown search to return only active memberships in the selected business and selected loyalty program
- [x] Revalidate active selected-program membership server-side before awarding search-based stamps
- [x] Refresh or invalidate customer-search results after reconciliation succeeds where relevant
- [x] Preserve profiles, history, rewards, transactions, and other program/business memberships
- [x] Run static validation and safe non-destructive membership/search checks

## Acceptance
After reconciliation removes a member from the selected program, that customer no longer appears in Search Registered Customers for that program and direct search-based stamp requests are denied. Customers active in other programs/businesses remain preserved.