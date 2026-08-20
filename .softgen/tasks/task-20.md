---
title: Phase 2 customer list and issue stamp search
status: in_progress
priority: urgent
type: bug
tags: [phase-2, customers, issue-stamp, rls, staff-access]
created_by: agent
created_at: 2026-08-20T14:56:40Z
position: 20
---

## Notes
Phase 2 is limited to fixing Business Admin and Staff customer access plus Issue Stamp customer search. Do not change Loyalty Program access, payments, branding, billing, settings, templates, footer, or subscription plans. Business Admin and Staff must both see real registered customers for their authenticated business. Issue Stamp search must use database-level filtering by name, email, and phone, not load all customers and filter in the browser. Staff business context must come from authenticated active business_users membership. Business isolation and RLS must remain enabled.

## Checklist
- [x] Inspect Customers page query and business context resolution
- [x] Inspect Issue Stamp customer search/query and business context resolution
- [x] Inspect RLS policies for customers and customer_loyalty_cards
- [x] Verify real customer-to-business relationship records
- [x] Identify exact failing layer for Admin customer list
- [x] Identify exact failing layer for Staff customer list
- [x] Identify exact failing layer for Issue Stamp search
- [x] Apply minimal fix without changing Loyalty Program access
- [ ] Validate TypeScript/lint checks
- [ ] Report Phase 2 completion and stop

## Acceptance
Business Admin Customers page shows real registered customers for their business.
Staff Customers page shows the same business-scoped registered customers.
Issue Stamp searches real registered customers by name, email, and phone using database-level filtering.