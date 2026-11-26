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

## Checklist
- [ ] Inventory all email sending locations across API routes, server helpers, jobs, and background flows
- [ ] Confirm which flows map to the three allowed purposes and which must be disabled
- [ ] Implement a central allowlist or equivalent server-side safeguard for app-managed email sends
- [ ] Preserve existing SMTP configuration and approval/registration email content
- [ ] Document all discovered triggers and final allowed list

## Acceptance
Only business registration, business approval confirmation, and password reset can trigger outgoing emails.
All other app notifications remain in-app only and no longer consume SMTP.