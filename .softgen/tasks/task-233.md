---
title: Confirmation Email Resend Administration
status: done
priority: urgent
type: feature
tags: [auth, email, super-admin, confirmation]
created_by: agent
created_at: 2026-10-20T12:07:53Z
position: 233
---

## Notes
Diagnosed iCloud confirmation email reports and added a Super Admin-only resend confirmation feature for existing unconfirmed users. Evidence from opened code: business registration and customer registration use custom confirmation delivery through Supabase Admin `generateLink` plus Nodemailer SMTP in `src/pages/api/auth/register-business.ts` and `src/pages/api/auth/register-customer.ts`, not Supabase native email delivery. General SMTP configuration was not changed.

Verified database evidence for `footfit@icloud.com`: the Auth row exists, was created at `2026-10-19T20:11:15.001852+00:00`, and has `confirmation_sent_at=2026-10-19T20:11:14.914461+00:00`; `confirmed_at`, `email_confirmed_at`, and `last_sign_in_at` are blank. This means the missing-send-timestamp symptom was not reproduced in the database available to this session. Verified comparison evidence: multiple non-iCloud users from the same period have populated `confirmation_sent_at`, populated confirmation timestamps, and later sign-ins. Verified app evidence: `public.email_logs` has no record for `footfit@icloud.com`, so recipient-specific SMTP delivery, bounce, deferral, suppression, or inbox placement for the original attempt remains unverified from application data. Exact provider delivery evidence must be checked in the SMTP provider dashboard by recipient and timestamp.

Implemented resend safely for unconfirmed users generally, not only iCloud addresses. The resend implementation keeps confirmation links server-side, never logs tokens/full links, never creates duplicate users, and never marks users confirmed. For existing unconfirmed users, the Super Admin resend endpoint generates a server-side one-time email link and sends it through the shared Nodemailer confirmation-email helper. It records safe audit metadata only: administrator ID, target auth user ID, timestamp, outcome, and recipient domain. The Super Admin UI lists unconfirmed Auth users and disables the resend button while processing. Successful submission messages state that submission does not guarantee inbox delivery.

Files changed: `src/lib/server/confirmationEmail.ts`, `src/pages/api/admin/unconfirmed-users.ts`, `src/pages/api/admin/resend-confirmation.ts`, `src/pages/admin/index.tsx`, and this task file. Actual validation completed: `check_for_errors` passed with no CSS, linting, type checking, or server errors. Database checks verified the `footfit@icloud.com` Auth row, successful non-iCloud comparison rows, absence of app email-log delivery records for the affected recipient, and `audit_logs` schema compatibility. Not executed: sending a real resend to `footfit@icloud.com`, inbox delivery confirmation, SMTP provider event review, already-confirmed endpoint call, non-admin endpoint call, and rate-limit exhaustion test. No deployment, manual confirmation, user deletion/recreation, SMTP setting change, or production account status change was performed.

## Checklist
- [x] Trace business/customer signup and confirmation-email workflow
- [x] Check `footfit@icloud.com` Auth row, app email/audit evidence, and available delivery events without exposing secrets
- [x] Compare affected iCloud attempt with a successful non-iCloud confirmation attempt
- [x] Inspect Super Admin user-management interface and server-side admin authorization helpers
- [x] Implement Super Admin-only resend endpoint using existing confirmation workflow with rate limiting and safe audit logging
- [x] Add resend action for unconfirmed users in the existing Super Admin user-management UI
- [x] Verify already-confirmed handling, non-admin denial, rate limit handling, token/link secrecy, and project checks where possible; document unexecuted live-send tests
- [x] Document root cause, files changed, actual test results, and remaining manual steps

## Acceptance
Super Admins can resend confirmation emails to existing unconfirmed users without duplicate accounts or exposed tokens, while the diagnosis clearly states the verified cause or what remains unverified.