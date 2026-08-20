---
title: Customer business relationship
status: in_progress
priority: urgent
type: bug
tags: [customers, loyalty-cards, rls, business-relationship]
created_by: agent
created_at: 2026-08-20T14:51:02Z
position: 19
---

## Notes
Investigate and fix only the underlying customer-to-business relationship. Current issue: neither Business Admin nor Staff can see registered customers. Staff can now see Loyalty Programs, so do not change that functionality. Trace Customer Registration → Customer Account → Loyalty Card → Loyalty Program → Business. Verify customers, customer_loyalty_cards, loyalty_programs, businesses, business_id, customer_id, user_id, and RLS. Confirm that when a customer joins a business loyalty program, Supabase correctly associates the customer with that business. Do not create duplicate customers or loyalty programs.

## Checklist
- [x] Inspect customer registration and join flow code
- [x] Inspect working and broken customer visibility queries
- [x] Inspect schema and RLS for customers, customer_loyalty_cards, loyalty_programs, and businesses
- [x] Verify real customer-to-business relationship records in Supabase
- [x] Identify exact failing layer without changing Staff Loyalty Program functionality
- [x] Apply minimal fix only if relationship creation or visibility is broken
- [ ] Validate checks
- [ ] Report findings and stop

## Acceptance
A real customer who registers and joins a business loyalty program has one correct customer_loyalty_cards row linking customer_id, loyalty_program_id, and business_id.
Business Admin and authorized Staff can see that registered customer through the business relationship.
No duplicate customers or duplicate loyalty programs are created.