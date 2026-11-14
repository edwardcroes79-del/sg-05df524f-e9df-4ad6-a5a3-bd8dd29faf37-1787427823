---
title: Overdue invoice reminder management
status: in_progress
priority: urgent
type: feature
tags: [superadmin, billing, reminders, business-dashboard]
created_by: agent
created_at: 2026-11-14T17:17:02Z
position: 276
---

## Notes
Implement an Overdue Reminders subtab inside the existing Superadmin Payment Review section. This is a reminder-only feature for overdue subscription invoices; it must not add payment processing, payment links, checkout, suspension, or billing calculation changes. Use existing billing/payment review records as the source of truth. Dismissals and settings must be persisted server-side and must work across devices using the Aruba business-local calendar day. Preserve Task 274, Stamp Flow, Quick Stamp, existing Payment Review behavior, plans, add-ons, payment settings, loyalty data, and customer/business records.

## Checklist
- [x] Inspect existing Superadmin Payment Review UI and identify where to add the Overdue Reminders subtab without adding a new main navigation tab
- [x] Inspect existing billing/payment tables, invoice status fields, due dates, amount fields, and payment review APIs
- [x] Add minimal database support for reminder global setting, per-business opt-out/opt-in, and daily dismissal records with secure RLS or server-only access
- [x] Add secure Superadmin API endpoints for overdue reminder summary, business/invoice list, global setting updates, and per-business reminder toggles
- [x] Add secure Business Admin API endpoints for checking overdue reminder eligibility and dismissing the current Aruba-local day
- [x] Build the Superadmin Payment Review → Overdue Reminders subtab with summary cards, controls, preview, and overdue invoice table
- [ ] Add the Business Admin overdue invoice popup with Close-only dismissal and no payment functionality
- [ ] Validate permissions, invoice status filtering, daily dismissal behavior, and existing Payment Review behavior
- [ ] Run TypeScript/lint checks or targeted checks if full-project lint is killed by sandbox memory

## Acceptance
Superadmin can open Payment Review → Overdue Reminders to manage reminder settings for genuinely overdue invoices only.
Business Admin users with eligible overdue invoices see a close-only popup once per Aruba-local day, persisted server-side across devices.
No payment processing, invoice calculation changes, Stamp Flow, Quick Stamp, or customer registration changes are introduced.