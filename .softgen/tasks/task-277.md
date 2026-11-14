---
title: Manual overdue payment popup reminders
status: in_progress
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
- [ ] Inspect existing automatic overdue reminder schema, APIs, Superadmin UI, and Business Admin popup integration
- [ ] Add minimal database support for manual reminder records, display timestamps, dismissals, and secure RLS
- [ ] Extend Superadmin overdue reminders API to list eligible businesses, send manual reminders, and return manual/automatic history
- [ ] Extend Business Admin reminder API to deliver pending manual reminders only to authorized business users
- [ ] Add Send Manual Payment Reminder UI inside Payment Review → Overdue Reminders with business search, invoice context, editable default message, preview, and send action
- [ ] Add reminder history UI showing business, recipient, message, sent date, delivery/dismissal status, reminder type, and sender
- [ ] Add Business Admin manual reminder popup with title, custom message, optional invoice details, sent date, and Close action
- [ ] Verify manual dismissal does not affect automatic daily overdue reminder dismissal
- [ ] Run TypeScript/lint/error checks and document test results

## Acceptance
- Superadmin can send a manual popup reminder to an eligible business, including one with no assigned contract, when there is a legitimate outstanding payment or documented payment obligation.
- Business admins only see manual reminders intended for their own business, can close them once, and automatic overdue reminders remain independent.
- No payment-processing functionality, contract creation, invoice-generation changes, Stamp Flow changes, Quick Stamp changes, or customer registration changes are introduced.