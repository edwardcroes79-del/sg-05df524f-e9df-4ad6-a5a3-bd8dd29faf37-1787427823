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
Diagnose iCloud confirmation email reports and add a Super Admin-only resend confirmation feature for existing unconfirmed users. Must reuse the app’s custom Supabase Admin generateLink plus SMTP confirmation workflow, never expose confirmation tokens or full links to the browser/logs/audit records, never create duplicate accounts, never mark users confirmed, and preserve email verification. Do not change general SMTP configuration without evidence. Do not implement public self-service resend unless the admin resend is complete and architecture is safe.

## Checklist
- [ ] Trace business/customer signup and confirmation-email workflow
- [ ] Check `footfit@icloud.com` Auth row, app email/audit evidence, and available delivery events without exposing secrets
- [ ] Compare affected iCloud attempt with a successful non-iCloud confirmation attempt
- [ ] Inspect Super Admin user-management interface and server-side admin authorization helpers
- [ ] Implement Super Admin-only resend endpoint using existing confirmation workflow with rate limiting and safe audit logging
- [ ] Add resend action for unconfirmed users in the existing Super Admin user-management UI
- [ ] Verify already-confirmed handling, non-admin denial, rate limit handling, token/link secrecy, and project checks
- [ ] Document root cause, files changed, actual test results, and remaining manual steps

## Acceptance
Super Admins can resend confirmation emails to existing unconfirmed users without duplicate accounts or exposed tokens, while the diagnosis clearly states the verified cause or what remains unverified.