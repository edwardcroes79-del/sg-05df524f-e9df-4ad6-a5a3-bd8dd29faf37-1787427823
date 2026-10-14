---
title: VIP Member Identification
status: done
priority: urgent
type: bug
tags: [customers, vip, entitlement, memberships]
created_by: agent
created_at: 2026-10-14T19:17:49Z
position: 205
---

## Notes
Fixed the VIP Member Identification runtime error: `column customer_loyalty_cards.is_vip does not exist`. Root cause: the Customers page and VIP update API had been updated to select/update a membership-scoped `is_vip` field, but the live Supabase schema did not yet contain that column. The intended storage location is verified as `public.customer_loyalty_cards` because it is scoped by membership id, business id, loyalty program id, and status. Applied the smallest safe additive schema correction: `is_vip boolean NOT NULL DEFAULT false` plus an index for business/program/VIP filtering. Existing memberships default to non-VIP, preserving customer data and restoring regular member visibility when VIP only is off. Generated Supabase types were updated. Export/import, Reconcile Members, stamps, rewards, transaction history, plan prices, and unrelated features were not changed. No deployment was performed.

## Checklist
- [x] Inspect live `customer_loyalty_cards` schema and confirm whether `is_vip` exists
- [x] Inspect VIP migration, generated database types, Customers page query, and member VIP API
- [x] Identify the exact root cause of the query failure and intended membership-scoped storage
- [x] Apply the smallest safe schema/code correction after explaining any required migration
- [x] Restore Customers page behavior with VIP only off showing regular members
- [x] Verify VIP only on shows only memberships with verified VIP status
- [x] Preserve search, Excel export/import, Reconcile Members, stamps, rewards, and transaction history
- [x] Update generated types or query typing if required
- [x] Run static validation and safe non-destructive tests

## Acceptance
The Customers page loads all active memberships normally when VIP only is off. VIP only filters to verified VIP memberships. VIP status is stored per business/program membership and server-side authorization/entitlement checks remain enforced.