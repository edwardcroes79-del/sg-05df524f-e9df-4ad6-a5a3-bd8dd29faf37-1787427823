---
title: Business Contract Setup Foundation
status: done
priority: high
type: feature
tags: [contracts, admin, merchants, subscriptions]
created_by: agent
created_at: 2026-09-28T11:15:00Z
position: 73
---

## Notes
Built Phase 1 contract setup foundation for Business Contracts. Added nullable contract fields on `public.businesses`: `contract_term_months`, `contract_start_date`, `contract_end_date`, `contract_status`, and `renewal_date`. Contract terms are constrained to 6 or 12 months, and statuses are constrained to active, expiring, or expired. Existing businesses without contracts remain unassigned; no invented contract dates or automatic expirations were applied. Super Admin Merchants & Subscriptions now shows Business, Plan, Contract Term, Start, End, Renewal, and Contract Status, and can assign contracts later without changing business lifecycle status, plans, billing, add-ons, RLS, authentication, or customer data. Date calculation uses calendar months rather than fixed days.

## Checklist
- [x] Inspect existing Business, Subscription, Plan, Merchant, Status, and Super Admin architecture
- [x] Add nullable contract fields to the businesses table
- [x] Add database constraints for 6/12 month terms and active/expiring/expired statuses
- [x] Add migration file for contract schema foundation
- [x] Fetch contract fields in the existing Super Admin merchant query
- [x] Add Super Admin contract assignment controls for 6 or 12 month terms
- [x] Display Business, Plan, Contract Term, Start, End, Renewal, and Contract Status
- [x] Use calendar-month contract end and renewal calculations
- [x] Preserve existing businesses without contracts as unassigned
- [x] Verify existing business statuses, plans, billing, add-ons, RLS, auth, customer data, and trial/subscription fields remain unchanged
- [x] Run targeted contract regression checks and project validation

## Acceptance
Super Admin can assign a 6 or 12 month contract to an existing business.
Businesses without contracts remain unassigned and are not automatically expired.
Existing approval, billing, add-ons, auth, RLS, customer data, and status workflows remain unchanged.