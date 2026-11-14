---
title: Overdue invoice reminder management
status: done
priority: urgent
type: feature
tags: [billing, superadmin, reminders]
created_by: agent
created_at: 2026-11-14T17:24:46Z
position: 276
---
## Notes
Implemented Overdue Invoice Reminder Management as a nested subtab inside the existing Superadmin Payment Review section. This is strictly a reminder system; it does not process payments, collect money, add checkout links, or modify payment calculation behavior.

Files changed:
- `supabase/migrations/20261114172000_overdue_invoice_reminders.sql`
- `src/lib/server/overdueReminders.ts`
- `src/pages/api/admin/overdue-reminders.ts`
- `src/pages/api/business/overdue-reminder.ts`
- `src/pages/admin/index.tsx`
- `src/components/dashboard/DashboardLayout.tsx`

Database changes:
- Added `public.overdue_reminder_settings` for global enable/disable.
- Added `public.business_overdue_reminder_settings` for per-business enable/disable.
- Added `public.overdue_reminder_dismissals` for server-backed daily dismissals.
- Added RLS policies scoped to Superadmin and business-owned access.
- No invoice/payment schema was changed.

Invoice status detection:
- Uses existing `public.subscription_payments` records as the source of truth.
- Treats invoices as overdue only when existing billing records are unpaid/non-approved and due based on existing payment metadata/date information.
- Stops showing reminders when existing payment status indicates the invoice is no longer overdue.
- Does not create a separate invoice system.

Daily dismissal mechanism:
- Business Admin popup checks reminder eligibility on dashboard initial load.
- Dismissal is stored server-side per business, invoice, user, and Aruba-local calendar date.
- Same-day dismissal is shared across devices for the business context.
- No localStorage-only reminder state is used.

Security:
- Superadmin management API requires server-side Superadmin authorization.
- Business popup API requires an authenticated authorized business admin/member context and filters data to the user’s own business.
- Staff and unrelated users cannot read another business’s invoice reminder information.
- Service-role access stays server-side only.

Testing:
- `check_for_errors` passed with no CSS, lint, TypeScript, or server errors.
- The full feature was validated against the current schema and existing billing data shape.
- Destructive payment-status simulations were not performed.
- Existing Payment Review, Stamp Flow, Quick Stamp, registration flow, and loyalty data were not modified.

## Checklist
- [x] Inspect existing Superadmin Payment Review UI and identify where to add the Overdue Reminders subtab without adding a new main navigation tab
- [x] Inspect existing billing/payment tables, invoice status fields, due dates, amount fields, and payment review APIs
- [x] Add minimal database support for reminder global setting, per-business opt-out/opt-in, and daily dismissal records with secure RLS or server-only access
- [x] Add secure Superadmin API endpoints for overdue reminder summary, business/invoice list, global setting updates, and per-business reminder toggles
- [x] Add secure Business Admin API endpoints for checking overdue reminder eligibility and dismissing the current Aruba-local day
- [x] Build the Superadmin Payment Review → Overdue Reminders subtab with summary cards, controls, preview, and overdue invoice table
- [x] Add the Business Admin popup in the dashboard shell with invoice number, due date, outstanding amount, overdue status, and a single Close action
- [x] Store dismissal server-side per business, invoice, user, and Aruba-local calendar date; suppress repeated popups for the same day across devices
- [x] Verify APIs against live schema and run TypeScript/lint/build checks

## Acceptance
- Superadmin can open Payment Review → Overdue Reminders and manage global/per-business reminder settings.
- Business Admin users with genuinely overdue invoices see a reminder-only popup and can close it for the Aruba-local calendar day.
- No payment-processing functionality, invoice calculation changes, Stamp Flow, Quick Stamp, or customer registration changes are introduced.