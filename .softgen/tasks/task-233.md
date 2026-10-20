---
title: Confirmation Email Resend Administration
status: in_progress
priority: urgent
type: feature
tags: [auth, email, super-admin, confirmation]
created_by: agent
created_at: 2026-10-20T12:07:53Z
position: 233
---

## Notes
Diagnose iCloud confirmation email reports and add a Super Admin-only resend confirmation feature for existing unconfirmed users. Evidence from opened code: business registration and customer registration use custom confirmation delivery through Supabase Admin `generateLink` plus Nodemailer SMTP in `src/pages/api/auth/register-business.ts` and `src/pages/api/auth/register-customer.ts`, not Supabase native email delivery. The custom signup endpoints do not write durable confirmation-email delivery events to `email_logs`, so recipient-specific delivery, bounce, suppression, or deferral for the original `footfit@icloud.com` attempt cannot be verified from the app database unless Supabase/Auth audit data contains it or the SMTP provider dashboard has it. The resend implementation keeps confirmation links server-side, never logs tokens/full links, never creates duplicate users, and never marks users confirmed. For existing unconfirmed users, the Super Admin resend endpoint generates a server-side one-time email link and sends it through the same Nodemailer SMTP path. It records safe audit metadata only: admin ID, target auth user ID, timestamp, outcome, and recipient domain. General SMTP configuration was not changed.

## Checklist
- [x] Trace business/customer signup and confirmation-email workflow
- [ ] Check `footfit@icloud.com` Auth row, app email/audit evidence, and available delivery events without exposing secrets
- [ ] Compare affected iCloud attempt with a successful non-iCloud confirmation attempt
- [x] Inspect Super Admin user-management interface and server-side admin authorization helpers
- [x] Implement Super Admin-only resend endpoint using existing confirmation workflow with rate limiting and safe audit logging
- [x] Add resend action for unconfirmed users in the existing Super Admin user-management UI
- [ ] Verify already-confirmed handling, non-admin denial, rate limit handling, token/link secrecy, and project checks
- [ ] Document root cause, files changed, actual test results, and remaining manual steps

## Acceptance
Super Admins can resend confirmation emails to existing unconfirmed users without duplicate accounts or exposed tokens, while the diagnosis clearly states the verified cause or what remains unverified.