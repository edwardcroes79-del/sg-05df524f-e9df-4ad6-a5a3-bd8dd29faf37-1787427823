---
title: VIP Member Identification
status: in_progress
priority: urgent
type: bug
tags: [customers, vip, entitlement, memberships]
created_by: agent
created_at: 2026-10-14T19:17:49Z
position: 205
---

## Notes
VIP Member Identification was added with membership-scoped UI/API logic, but the Customers page now fails with `column customer_loyalty_cards.is_vip does not exist`. Current fix scope: inspect live Supabase schema, migration files, generated types, and recent VIP feature changes; confirm intended VIP storage location; apply the smallest safe schema/code correction only after verifying whether a migration is required. Existing regular members must appear when VIP only is off, VIP only must show verified VIP memberships only, and existing export/import/reconciliation/stamps/rewards/history must remain unchanged. No customer data, production records, unrelated features, plan prices, or deployment should be modified.

## Checklist
- [ ] Inspect live `customer_loyalty_cards` schema and confirm whether `is_vip` exists
- [ ] Inspect VIP migration, generated database types, Customers page query, and member VIP API
- [ ] Identify the exact root cause of the query failure and intended membership-scoped storage
- [ ] Apply the smallest safe schema/code correction after explaining any required migration
- [ ] Restore Customers page behavior with VIP only off showing regular members
- [ ] Verify VIP only on shows only memberships with verified VIP status
- [ ] Preserve search, Excel export/import, Reconcile Members, stamps, rewards, and transaction history
- [ ] Update generated types or query typing if required
- [ ] Run static validation and safe non-destructive tests

## Acceptance
The Customers page loads all active memberships normally when VIP only is off. VIP only filters to verified VIP memberships. VIP status is stored per business/program membership and server-side authorization/entitlement checks remain enforced.