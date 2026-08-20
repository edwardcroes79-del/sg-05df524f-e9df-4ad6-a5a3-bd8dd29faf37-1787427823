---
title: Issue Stamp customer search and Staff loyalty program access
status: in_progress
priority: urgent
type: bug
tags: [staff-access, issue-stamp, rls, customers, loyalty-programs]
created_by: agent
created_at: 2026-08-20T14:29:11Z
position: 18
---

## Notes
Fix the combined regression where Business Owners can see registered customers on the Customers page but not in Issue Stamp customer search, Staff cannot see customers in Issue Stamp search, and Staff still cannot see Business Owner-created Loyalty Programs. Diagnose the complete flow before modifying: authenticated user, business ownership/membership, business_id resolution, customer_loyalty_cards, loyalty_programs, RLS policies, Issue Stamp query, and Staff Loyalty Programs query. Do not modify billing, settings, payments, Sentoo, branding, templates, footer, or subscription plans. No mock data, duplicate programs, public customer data, RLS disablement, or frontend-only security.

## Checklist
- [ ] Inspect Issue Stamp customer search query and compare with working Customers page query
- [ ] Inspect Staff Loyalty Programs query and business membership resolution
- [ ] Inspect RLS policies for customers, customer_loyalty_cards, loyalty_programs, stamp_transactions, business_users, and businesses
- [ ] Identify exact failing layer for Owner Issue Stamp customer search
- [ ] Identify exact failing layer for Staff Issue Stamp customer search
- [ ] Identify exact failing layer for Staff Loyalty Programs visibility
- [ ] Apply minimal backend/frontend fix preserving Owner CRUD and Staff read/use permissions
- [ ] Validate TypeScript/lint checks
- [ ] Provide debug report with root cause and fix summary

## Acceptance
Business Owner can search registered customers in Issue Stamp, select an existing Loyalty Program, and issue a real stamp.
Staff can search business customers in Issue Stamp, see Owner-created Loyalty Programs, and issue a real stamp without edit permissions.
Business data remains isolated across tenants with RLS intact.