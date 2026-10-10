---
title: Email Logs Access Security
status: in_progress
priority: high
type: bug
tags: [security, rls, email-logs, admin]
created_by: agent
created_at: 2026-10-10T17:18:15Z
position: 173
---

## Notes
Phase 3A scope only: inspect, remediate, and verify `email_logs` RLS policies, table grants, and directly related admin/server workflows. Requirements: preserve legitimate server-side email logging and Super Admin workflows used by `src/pages/admin/index.tsx`, `src/pages/api/admin/approve-business.ts`, `src/pages/api/admin/notify-registration.ts`, and `src/pages/api/admin/process-contract-reminders.ts`. Do not modify unrelated RLS policies, authentication flows, SMTP configuration, database records, Turnstile, password recovery, registration flows, reward redemption, deployment, or production configuration. Do not expose real email addresses, message contents, or personal data.

## Checklist
- [ ] Inspect `email_logs` schema, RLS status, all policies, and table grants
- [ ] Inspect effective permissions for `anon`, `authenticated`, `service_role`, and `PUBLIC`
- [ ] Inspect listed admin/server workflows and shared logging helpers
- [ ] Determine required SELECT, INSERT, UPDATE, and DELETE operations
- [ ] Apply the smallest safe correction if broad access is confirmed
- [ ] Validate anon/authenticated denial and Super Admin/server workflow compatibility where safely testable
- [ ] Run project validation and report actual tests

## Acceptance
Anonymous and ordinary authenticated users cannot read or modify email logs. Legitimate server-side email logging and Super Admin dashboard access remain compatible. No unrelated application behavior or production deployment is changed.