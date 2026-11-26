---
title: Non-essential automatic email disablement
status: done
priority: high
type: bug
tags: [email, smtp, notifications]
created_by: agent
created_at: 2026-11-26T18:38:28Z
position: 314
---
## Notes
Disable all non-essential automatic SMTP sends while preserving in-app notifications, database records, read/unread state, and existing dashboard notification behavior.

Implemented scope:
- Disabled customer stamp receipt emails in `src/pages/api/customer/stamp-receipt.ts`.
- Disabled setup assistance SMTP sends in `src/lib/server/setupAssistanceNotifications.ts` before transporter/email-log preparation.
- Disabled contract reminder SMTP sends in `src/pages/api/admin/process-contract-reminders.ts` before reminder/email-log reservation.
- Left database-backed and in-app notifications unchanged.

## Checklist
- [x] Disable customer stamp notification emails without affecting stamp issuance
- [x] Disable setup assistance SMTP sends while preserving in-app notifications
- [x] Disable contract reminder SMTP sends while preserving non-email reminder behavior
- [x] Ensure blocked email events no longer reach SMTP or app-managed retry preparation

## Acceptance
Non-essential automatic emails no longer consume SMTP.
Existing in-app notifications and underlying app workflows remain available.