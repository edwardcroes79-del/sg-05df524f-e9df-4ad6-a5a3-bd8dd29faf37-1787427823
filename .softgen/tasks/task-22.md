---
title: Fix Total Customers and Issue Stamp Customer Search
status: in_progress
priority: urgent
type: bug
tags: [dashboard, issue-stamp, customers, metrics]
created_by: agent
created_at: 2026-08-20T15:26:58Z
position: 22
---

## Notes
- Dashboard Overview -> Total Customers does not display the registered customer count.
- Issue Loyalty Stamp does not show registered customers to select/search for stamping.
- Both must use the same single source of truth: `customer_loyalty_cards` relationship.
- Must use database-level search for Issue Stamp.
- Must use efficient database count for Total Customers.
- Must isolate by business for both Admin and Staff.

## Checklist
- [x] Inspect Total Customers query in Dashboard Overview
- [x] Verify Issue Stamp customer search RPC and usage
- [x] Fix Total Customers count to use real customer_loyalty_cards count
- [x] Ensure Issue Stamp uses the same relationship correctly (redirect to scan.tsx)
- [ ] Test Admin and Staff roles
- [ ] Run typescript and validation tests