---
title: Business Approval Email Delivery Fix
status: in_progress
priority: urgent
type: bug
tags: [admin, email, business-approval, notifications]
created_by: agent
created_at: 2026-09-27T03:08:03Z
position: 69
---

## Notes
Fix the Business approval workflow where Super Admin approval succeeds but the approved Business does not receive the account-approved email. Investigation found active approved businesses with `approval_email_status = pending` and no `client_approval` row in `email_logs`, proving approval success did not guarantee email submission. The existing `/api/admin/approve-business` route also returned early when a business was already active and not a retry, which prevented missing approval emails from being sent for active businesses whose email status/log was still pending or absent. The route also used the owner auth email first and generated a legacy `arubaroyaltystamp.com` URL from `origin`; the fix now prefers the registered `businesses.email`, keeps owner auth email only as fallback, prepares/updates the email log before deciding whether to skip sending, sends missing approval emails even when the business is already active, updates the log recipient on retry, does not reset trial/plan/subscription fields, and strictly uses `https://royaltystamp.com/dashboard` in the email.

## Checklist
- [x] Inspect Super Admin business approval handler and UI email-status display
- [x] Inspect approval API/server route and existing email sending architecture
- [x] Inspect email logs/status schema and resend approval email flow
- [x] Identify the actual root cause before editing
- [x] Fix approval email sending and status recording using existing server-side email service
- [x] Ensure production links use https://royaltystamp.com
- [x] Preserve resend approval email without changing business approval status
- [ ] Verify provider success/failure is reflected accurately in Super Admin
- [ ] Run project validation and targeted email workflow checks

## Acceptance
Approving a pending Business triggers the approved-account email through the existing server-side email provider.
Super Admin email status shows Sent only after successful provider submission, otherwise Failed with retry available.
Resending the approval email works without duplicating or changing the Business account.