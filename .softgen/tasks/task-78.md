---
title: Business Dashboard Contract Information
status: in_progress
priority: high
type: feature
tags: [contracts, business-dashboard, read-only]
created_by: agent
created_at: 2026-09-28T11:59:29Z
position: 78
---

## Notes
Add a responsive, read-only Contract Information section to the existing Business Admin Dashboard using the existing Phase 1–4 contract fields. Business users may view only their own contract status, term, start date, end date, and days remaining. Do not add Super Admin controls, modification actions, duplicate contract data, or changes to contract logic, renewal logic, billing, plans, add-ons, authentication, RLS, or access-control behavior. Use actual stored database values and existing dashboard styling.

## Checklist
- [ ] Inspect Business Admin Dashboard data loading and existing contract field availability
- [ ] Add read-only contract summary using actual contract_status, contract_term_months, contract_start_date, contract_end_date, and renewal data where available
- [ ] Display active, expiring, expired, and unassigned states with clear copy
- [ ] Show warning when contract is approaching expiration, including 14-day messaging
- [ ] Ensure expired contract copy matches the requested renewal contact message
- [ ] Keep all contract fields non-editable for business users
- [ ] Make the section responsive across desktop, tablet, and mobile
- [ ] Test active, expiring, expired, and unassigned contract display states
- [ ] Run project validation

## Acceptance
Business Admin Dashboard shows a responsive read-only Contract Information section from stored contract data.
Businesses cannot edit contract term, start date, end date, or status from the dashboard.
Active, expiring, and expired contracts show the correct status, dates, days remaining, and warning/expired messages.