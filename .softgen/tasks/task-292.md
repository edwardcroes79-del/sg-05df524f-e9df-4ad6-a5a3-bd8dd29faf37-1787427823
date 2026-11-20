---
title: One-month subscription term
status: done
priority: high
type: feature
tags: [billing, contracts, superadmin, subscriptions]
created_by: agent
created_at: 2026-11-20T16:07:03Z
position: 292
---

## Notes
Add a 1-month contract term alongside the existing 6- and 12-month terms in the Superadmin business subscription table. One-month terms use one calendar month, upfront payment, and no auto-renew or auto-charge. Each renewal reuses the existing bank-transfer payment-proof upload and Superadmin approval workflow before the next period activates. Pricing uses existing monthly plan pricing. Reminders, expiration, the 3-day grace period, and automatic On Hold must work with 1-month terms. Do not change existing 6/12-month contracts, business data, customers, stamps, rewards, invoices, or transactions. Inspect DB constraints (contract_term_months check) before any migration.

## Checklist
- [ ] Inspect contract term storage, DB constraints, date calculation, pricing totals, reminders, grace period, and On Hold logic
- [ ] Add 1 month option to the Superadmin contract term dropdown, keeping 6 and 12 months
- [ ] Calculate start/end dates as one calendar month and show monthly price × term total
- [ ] Allow 1-month term in server validation and DB constraints (migration only if a constraint blocks it)
- [ ] Ensure renewal requires new payment proof + Superadmin approval, no auto-renew
- [ ] Confirm reminders, 3-day grace period, and automatic On Hold handle 1-month terms
- [ ] Verify all three terms show correct dates, prices, renewal requirements, and statuses

## Acceptance
Superadmin can assign 1, 6, or 12 months and sees correct start/end dates and totals.
A 1-month business is reminded before expiry, enters the 3-day grace period, then goes On Hold until a new payment proof is approved.
Existing 6- and 12-month contracts are unchanged.