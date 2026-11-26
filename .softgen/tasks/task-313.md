---
title: SMTP trigger audit and allowlist
status: in_progress
priority: urgent
type: bug
tags: [email, smtp, audit, security]
created_by: agent
created_at: 2026-11-26T18:38:28Z
position: 313
---
## Notes
Audit all outgoing email triggers in Royalty Stamp and identify exactly which flows currently send through SMTP or any app-managed email path. Preserve only three allowed purposes: business registration, Super Admin business approval confirmation, and password reset. Do not break the existing business approval workflow or Supabase Auth password reset. Build a central safeguard so blocked email events cannot queue or retry.

SMTP audit evidence from code search:
- `src/pages/api/auth/register-business.ts` sends the business registration confirmation email via Nodemailer SMTP. This must remain allowed.
- `src/pages/api/admin/approve-business.ts` sends the Super Admin business approval confirmation email via Nodemailer SMTP. This must remain allowed.
- `src/pages/api/auth/request-password-recovery.ts` sends the password reset email via Nodemailer SMTP carrying the Supabase-generated recovery link. This must remain allowed.
- `src/pages/api/customer/stamp-receipt.ts` sends customer stamp receipt emails via Nodemailer SMTP. This must be disabled.
- `src/lib/server/setupAssistanceNotifications.ts` sends setup assistance request/status emails via Nodemailer SMTP. These must be disabled while preserving in-app notifications and database records.
- `src/pages/api/admin/process-contract-reminders.ts` sends contract reminder emails via Nodemailer SMTP. These must be disabled while preserving reminder records and in-app visibility.
- `src/pages/api/admin/notify-registration.ts` sends registration-related admin notification emails via Nodemailer SMTP. Scope still being verified against the user's allowlist and workflow requirements.
- `src/lib/server/confirmationEmail.ts` is a shared SMTP helper used by confirmation/resend flows. Its callers include `src/pages/api/admin/resend-confirmation.ts` and setup flows. Caller-by-caller review is required before allowlisting.
- `src/pages/api/auth/register-customer.ts` also uses custom SMTP confirmation delivery and must be reviewed against the new restriction because customer registration is not in the allowed list.

Current classification:
- Allowed: business registration, Super Admin business approval confirmation, password reset.
- Pending review: admin registration notification, customer registration confirmation, confirmation resend.
- Blocked target category: customer stamp emails, setup assistance emails, contract/payment reminder emails, and all other non-allowed automatic SMTP sends.

## Checklist
- [x] Inventory all email sending locations across API routes, server helpers, jobs, and background flows
- [ ] Confirm which flows map to the three allowed purposes and which must be disabled
- [ ] Implement a central allowlist or equivalent server-side safeguard for app-managed email sends
- [ ] Preserve existing SMTP configuration and approval/registration email content
- [ ] Document all discovered triggers and final allowed list

## Acceptance
Only business registration, business approval confirmation, and password reset can trigger outgoing emails.
All other app notifications remain in-app only and no longer consume SMTP.