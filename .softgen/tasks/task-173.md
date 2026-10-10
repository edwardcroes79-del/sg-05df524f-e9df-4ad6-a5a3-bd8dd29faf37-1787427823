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
Phase 3A scope only: inspected, remediated, and verified `email_logs` RLS policies, table grants, and directly related admin/server workflows. Confirmed `email_logs` had RLS enabled but the only policy was `Super Admins can manage email logs` with `roles: {public}`, `cmd: ALL`, and `qual: true`. Confirmed broad table grants existed for `anon` and `authenticated` including SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER. Inspected workflows: `src/pages/admin/index.tsx` reads email log status through an authenticated Super Admin dashboard query; `src/pages/api/admin/approve-business.ts` authenticates Super Admin before service-role email log select/insert/update; `src/pages/api/admin/notify-registration.ts` uses service-role email log select/insert/update for onboarding/admin retry notifications; `src/pages/api/admin/process-contract-reminders.ts` uses cron authorization plus service-role email log select/insert/update. No inspected workflow required ordinary anon/authenticated direct INSERT, UPDATE, or DELETE on `email_logs`. Applied the smallest safe correction: replaced the broad ALL policy with authenticated Super Admin SELECT only, revoked direct table privileges from anon/authenticated, and granted SELECT to authenticated so RLS can permit Super Admin dashboard reads. Service-role privileges were preserved for trusted server-side logging. Added migration `supabase/migrations/20261010171900_secure_email_logs_access.sql`. No real email log rows, email addresses, message contents, or personal data were read/exported.

## Checklist
- [x] Inspect `email_logs` schema, RLS status, all policies, and table grants
- [x] Inspect effective permissions for `anon`, `authenticated`, `service_role`, and `PUBLIC`
- [x] Inspect listed admin/server workflows and shared logging helpers
- [x] Determine required SELECT, INSERT, UPDATE, and DELETE operations
- [x] Apply the smallest safe correction if broad access is confirmed
- [ ] Validate anon/authenticated denial and Super Admin/server workflow compatibility where safely testable
- [ ] Run project validation and report actual tests

## Acceptance
Anonymous and ordinary authenticated users cannot read or modify email logs. Legitimate server-side email logging and Super Admin dashboard access remain compatible. No unrelated application behavior or production deployment is changed.