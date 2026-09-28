---
title: Business Contract Setup Foundation
status: in_progress
priority: high
type: feature
tags: [admin, contracts, businesses, subscriptions]
created_by: agent
created_at: 2026-09-28T11:14:08Z
position: 73
---

## Notes
Build Phase 1 contract setup foundation for Business Contracts. Inspect existing Business, Subscription, Plan, Merchant, Status, and Super Admin architecture first, then reuse existing structures where appropriate. Add contract fields for 6/12 month term, start date, end date, status, and renewal date. Contract status must support ACTIVE, EXPIRING, and EXPIRED. Use calendar month calculations, not fixed days. Add Contract Term management to the existing Super Admin business/merchant screen so Super Admin can assign 6 or 12 months and see Business, Plan, Contract Term, Start, End, and Status. Existing businesses without contracts must not receive invented dates or automatic expiration. Do not change existing business statuses, plans, billing, add-ons, RLS, authentication, customer data, approval, or Suspend/Activate behavior. Do not build expiration blocking in this phase.

## Checklist
- [ ] Inspect current businesses, subscription plans, merchant table, status, and Super Admin update patterns
- [ ] Add nullable contract fields without changing existing business statuses or plan data
- [ ] Implement calendar-month contract date calculation for 6 and 12 month terms
- [ ] Add Super Admin contract assignment UI to the existing Merchants & Subscriptions screen
- [ ] Display Business, Plan, Contract Term, Start, End, Status, and Renewal Date
- [ ] Ensure businesses without contracts show a clear unassigned state and are not auto-expired
- [ ] Verify database changes and UI validation
- [ ] Stop after this phase and wait for the next instruction

## Acceptance
Super Admin can assign a 6 or 12 month contract to a business.
Contract dates/status are stored in Supabase and calculated using calendar months.
Existing businesses without contracts remain unassigned and unaffected.
Existing approval, billing, add-ons, auth, RLS, customer data, and status workflows remain unchanged.