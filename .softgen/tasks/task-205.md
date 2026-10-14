---
title: VIP Member Identification
status: in_progress
priority: high
type: feature
tags: [customers, vip, entitlement, memberships]
created_by: agent
created_at: 2026-10-14T19:17:49Z
position: 205
---

## Notes
Implement VIP Member Identification as a focused feature. Inspect the existing Customers page, member details, database schema/types, plan-entitlement registry, and authorization helpers before changing schema or UI. Add a separate `vip_member_identification` entitlement through the existing entitlement architecture, initially intended for Corporate subject to current plan verification. Authorized business Owners should be able to mark/unmark a customer membership as VIP within the correct business and loyalty-program membership scope. Display VIP badges in customer list/member details and add a VIP-only filter. Server-side authorization and entitlement enforcement are required. VIP status must not affect stamps, rewards, registration, history, plan prices, customer data, or deployment.

## Checklist
- [ ] Inspect Customers page, member detail UI, schema/types, entitlement registry, and owner authorization helpers
- [ ] Determine whether a membership-scoped schema migration is required and keep VIP status business/program scoped
- [ ] Add `vip_member_identification` entitlement to the existing entitlement registry and Super Admin controls
- [ ] Add owner-only, entitlement-checked server endpoint for marking/unmarking membership VIP status
- [ ] Add VIP badge in customer list and member detail surfaces
- [ ] Add VIP-only filter on Registered Customers
- [ ] Ensure VIP changes do not alter stamps, rewards, registration, or history
- [ ] Run static validation and safe authorization/schema checks
- [ ] Report changed files, migration requirements, entitlement behavior, tests run, and remaining risks

## Acceptance
Entitled Owners can mark/unmark VIP status for a selected business/program membership only. VIP status is visible and filterable on Registered Customers. Server-side checks prevent unauthorized or non-entitled updates, and unrelated loyalty history remains unchanged.