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

Final SMTP inventory from code search:
- `src/pages/api/auth/register-business.ts` sends the business registration confirmation email via Nodemailer SMTP. Allowed.
- `src/pages/api/admin/notify-registration.ts` sends the Super Admin registration-review notification email via Nodemailer SMTP as part of the business registration workflow. Allowed.
- `src/lib/server/confirmationEmail.ts` sends confirmation resend emails. Restricted so only business-registration accounts can use it through `src/pages/api/admin/resend-confirmation.ts`. Allowed only for business registration accounts.
- `src/pages/api/admin/approve-business.ts` sends the Super Admin business approval confirmation email via Nodemailer SMTP. Allowed.
- `src/pages/api/auth/request-password-recovery.ts` sends the password reset email via Nodemailer SMTP using the Supabase-generated recovery link. Allowed.
- `src/pages/api/customer/stamp-receipt.ts` sends customer stamp receipt emails via Nodemailer SMTP. Disabled.
- `src/lib/server/setupAssistanceNotifications.ts` sends setup assistance request/status emails via Nodemailer SMTP. Disabled.
- `src/pages/api/admin/process-contract-reminders.ts` sends contract reminder emails via Nodemailer SMTP. Disabled.
- `src/lib/server/overdueReminders.ts` does not send SMTP email. No changes required.
- `src/lib/server/manualPaymentReminders.ts` does not send SMTP email. No changes required.

Current allowed purposes:
- `business_registration_confirmation`
- `business_registration_admin_notification`
- `business_approval_confirmation`
- `password_reset`

Current blocked category:
- customer stamp emails
- setup assistance emails
- contract reminder emails
- all other non-allowed automatic SMTP sends

Implementation progress:
- Added `src/lib/server/emailAllowlist.ts` as the central server-side purpose allowlist.
- Wired the allowlist into allowed senders in `register-business`, `notify-registration`, `approve-business`, and `request-password-recovery`.
- Restricted `src/lib/server/confirmationEmail.ts` and `src/pages/api/admin/resend-confirmation.ts` so confirmation resend only works for business-registration accounts.
- Disabled stamp receipt SMTP at the API boundary in `src/pages/api/customer/stamp-receipt.ts`.
- Disabled setup assistance SMTP before any email-log/retry preparation in `src/lib/server/setupAssistanceNotifications.ts`.
- Disabled contract reminder SMTP before reminder/email-log reservation in `src/pages/api/admin/process-contract-reminders.ts`.

Remaining work:
- Run validation and report final test outcomes for allowed vs blocked SMTP paths.
- Capture the final modified-file list and user-facing results after checks pass.

## Checklist
- [x] Inventory all email sending locations across API routes, server helpers, jobs, and background flows
- [x] Confirm which flows map to the three allowed purposes and which must be disabled
- [x] Implement a central allowlist or equivalent server-side safeguard for app-managed email sends
- [x] Preserve existing SMTP configuration and approval/registration email content
- [ ] Document all discovered triggers and final allowed list

## Acceptance
Only business registration, business approval confirmation, and password reset can trigger outgoing emails.
All other app notifications remain in-app only and no longer consume SMTP.