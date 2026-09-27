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
Fix the Business approval workflow where Super Admin approval succeeds but the approved Business does not receive the account-approved email. Investigate the existing approval flow first: Super Admin approve handler, API/server action, email function, recipient address, SMTP/email provider configuration, provider response, email log/status, and resend behavior. Reuse the existing Royalty Stamp server-side email architecture and do not add a second provider. Approval email links must use https://royaltystamp.com, not localhost or Softgen preview URLs. If email delivery fails, business approval must remain successful, the failure must be recorded, and Super Admin must be able to retry/resend the approval email. Do not modify unrelated billing, add-ons, plans, loyalty, staff, QR, or dashboard functionality.

## Checklist
- [ ] Inspect Super Admin business approval handler and UI email-status display
- [ ] Inspect approval API/server route and existing email sending architecture
- [ ] Inspect email logs/status schema and resend approval email flow
- [ ] Identify the actual root cause before editing
- [ ] Fix approval email sending and status recording using existing server-side email service
- [ ] Ensure production links use https://royaltystamp.com
- [ ] Preserve resend approval email without changing business approval status
- [ ] Verify provider success/failure is reflected accurately in Super Admin
- [ ] Run project validation and targeted email workflow checks

## Acceptance
Approving a pending Business triggers the approved-account email through the existing server-side email provider.
Super Admin email status shows Sent only after successful provider submission, otherwise Failed with retry available.
Resending the approval email works without duplicating or changing the Business account.