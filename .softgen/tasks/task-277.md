---
title: Manual overdue payment popup reminders
status: done
priority: urgent
type: feature
tags: [billing, superadmin, reminders]
created_by: agent
created_at: 2026-11-14T17:26:30Z
position: 277
---
## Notes
Extend the existing Superadmin Portal → Payment Review → Overdue Reminders section with manual popup payment reminders. Manual reminders must be separate from automatic overdue reminders, must not add payment processing, must not create contracts, and must not mark invoices overdue. Superadmin can select a business, review subscription/payment context, compose a custom message, preview it, send it, and view delivery/dismissal history. Business admins see each manual reminder once until acknowledged/dismissed. Automatic daily reminders continue independently.

Strict protections: do not modify customer registration/synchronization, invoice generation, payment review behavior, subscription calculations, contract assignment, Stamp Flow, Quick Stamp, loyalty records, or rewards. Use server-side authorization only. Store reminder records securely and filter business-facing reads to the recipient business.

## Checklist
- [x] Inspect existing automatic overdue reminder schema, APIs, Superadmin UI, and Business Admin popup integration
- [x] Add database storage for manual payment reminder records, recipient, custom message, sent/display/dismiss timestamps, invoice/payment metadata, and secure RLS
- [x] Add Superadmin API support for searchable business reminder options, legitimate outstanding-payment validation, send action, and history
- [x] Add Business Admin API support for fetching and dismissing pending manual reminders without touching automatic reminders
- [x] Add Superadmin UI section "Send Manual Payment Reminder" inside Payment Review → Overdue Reminders with business selection, status details, custom message, preview, send action, and history
- [x] Add Business Admin popup titled "Payment Reminder" with custom message, optional invoice details, sent date, and Close only
- [x] Validate TypeScript/lint/build checks and run non-destructive database/API verification

## Acceptance
- Superadmin can send a manual popup reminder to an eligible business, including one with no assigned contract, when there is a legitimate outstanding payment or documented payment obligation.
- Business admins only see manual reminders intended for their own business, can close them once, and automatic overdue reminders remain independent.
- No payment-processing functionality, contract creation, invoice-generation changes, Stamp Flow changes, Quick Stamp changes, or customer registration changes are introduced.