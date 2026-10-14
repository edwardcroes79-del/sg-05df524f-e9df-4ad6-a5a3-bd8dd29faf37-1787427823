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
Implement VIP Member Identification as a focused feature. Inspection found `customer_loyalty_cards` has membership/business/program scope (`id`, `customer_id`, `business_id`, `loyalty_program_id`, `status`) but no VIP column, so a membership-scoped migration file is required. Live plan configuration already has `vip_member_identification` rows enabled for Corporate (`mega_plan`) and Enterprise, and the entitlement key is present in the standard registry for Super Admin plan controls. Added an unapplied migration file for `customer_loyalty_cards.is_vip`, a server-side owner/entitlement checked update API, and Customers page VIP badges/filter/mark-unmark controls. No customer rows, production records, stamps, rewards, history, or plan prices were modified.

## Checklist
- [x] Inspect Customers page, member detail UI, schema/types, entitlement registry, and owner authorization helpers
- [x] Determine whether a membership-scoped schema migration is required and keep VIP status business/program scoped
- [x] Add `vip_member_identification` entitlement to the existing entitlement registry and Super Admin controls
- [x] Add owner-only, entitlement-checked server endpoint for marking/unmarking membership VIP status
- [x] Add VIP badge in customer list and member detail surfaces
- [x] Add VIP-only filter on Registered Customers
- [x] Ensure VIP changes do not alter stamps, rewards, registration, or history
- [ ] Run static validation and safe authorization/schema checks
- [ ] Report changed files, migration requirements, entitlement behavior, tests run, and remaining risks

## Acceptance
Entitled Owners can mark/unmark VIP status for a selected business/program membership only. VIP status is visible and filterable on Registered Customers. Server-side checks prevent unauthorized or non-entitled updates, and unrelated loyalty history remains unchanged.