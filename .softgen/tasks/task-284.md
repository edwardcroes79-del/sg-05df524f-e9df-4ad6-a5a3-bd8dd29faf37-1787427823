---
title: Manual and automatic account on hold
status: in_progress
priority: urgent
type: feature
tags: [billing, superadmin, subscriptions, account-status]
created_by: agent
created_at: 2026-11-20T11:11:24Z
position: 284
---
## Notes
Extend the existing Account On Hold behaviour. Keep the automatic hold (subscription expiry + 3-day grace, payment not approved → On Hold). Add a manual hold that an authorized Superadmin can place on any business from Merchants & Subscriptions, regardless of contract length or whether a formal contract exists. Manual hold requires a reason, accepts an optional internal note, and records who/when/why plus whether the hold was manual or automatic. No invoices or payment obligations are created by placing a hold.

On hold, the Business Admin can still log in, sees the On Hold message and existing bank payment instructions, can upload payment proof and request restoration, and keeps access to billing and account information. All business data, customers, cards, stamps, rewards and transaction history are preserved.

Restoration goes through the existing Superadmin payment approval area: inspect receipt, approve or reject. Approval returns the account to Active and only changes subscription dates according to the approved payment period. Manual holds must not shift unrelated contract dates or create a new period unless the approval explicitly includes a renewal. Businesses cannot lift their own hold. Do not weaken RLS or rebuild existing subscription, payment, contract or approval systems.

Inspection findings (2026-11-20): no Account On Hold exists yet. `on_hold` appears nowhere in src; `businesses.status` defaults to `active` with no check constraint; the only expiry logic is `refresh_expired_business_contracts` (updates contract_status active/expiring/expired), with no grace period or hold. Relevant dates on businesses: contract_end_date, renewal_date, trial_end. Payment proof + Superadmin review already exist in `subscription_payments`.

User decisions:
- Scope: build both manual and automatic hold now, sharing one hold record and restoration flow.
- On Hold blocks: dashboard gated (owner/staff can log in; only Billing, Settings and the On Hold screen open; stamp engine code not modified) AND customers see a "temporarily unavailable" notice when joining or using the business's card.
- Automatic hold date source: contract_end_date for contracted businesses, else renewal_date; hold after 3-day grace without an approved payment.

## Checklist
- [ ] Inspect existing account status values, automatic expiry/grace enforcement, billing payment-proof flow, Superadmin payment approval, and business-side gating
- [ ] Post a brief implementation plan grounded in the actual code and schema
- [ ] Database: record hold type (manual/automatic), reason, internal note, who and when; keep automatic hold recording the same fields
- [ ] Server: Superadmin-only manual hold action with confirmation, required reason, optional note, audit entry; no invoice creation
- [ ] Superadmin UI: "Place Account On Hold" action in Merchants & Subscriptions with confirmation dialog, reason and note fields, and visible hold history
- [ ] Business UI: On Hold message with bank payment instructions, payment proof upload and restoration request while billing/account info stays accessible
- [ ] Restoration: restoration requests appear in the existing payment approval area; approval returns account to Active, renews dates only when the approved payment includes a period, and notifies the business
- [ ] Verify automatic hold, manual hold across contract types and no-contract monthly payers, business proof upload, restoration approval, and preserved hold history

## Acceptance
A Superadmin can place any business on hold with a reason, and the hold type, reason, note, actor and time are recorded.
A business on hold can still log in, see payment instructions, upload proof and request restoration, but cannot lift the hold itself.
Approving the restoration payment returns the account to Active without altering unrelated contract dates.