---
title: Password Recovery Link Prototype
status: in_progress
priority: high
type: feature
tags: [auth, password-recovery, diagnostics]
created_by: agent
created_at: 2026-10-10T17:35:21Z
position: 174
---

## Notes
Phase 1 scope only: implemented a minimal isolated server-side diagnostic endpoint to validate Supabase Admin recovery-link generation for an explicitly configured synthetic test account. Production reset flow remains unchanged. The endpoint uses the service-role key server-side only, requires explicit non-production enablement plus a diagnostic secret, rejects arbitrary emails, uses the canonical redirect `https://royaltystamp.com/auth/update-password`, never sends email, and never returns or logs the raw action link or token. Endpoint path: `src/pages/api/auth/recovery-link-prototype.ts`. It is disabled unless `PASSWORD_RECOVERY_PROTOTYPE_ENABLED=true`, `PASSWORD_RECOVERY_PROTOTYPE_SECRET`, and `PASSWORD_RECOVERY_PROTOTYPE_EMAIL` are configured, and it refuses to run when `VERCEL_ENV=production`.

## Checklist
- [x] Inspect existing registration SMTP/Admin link patterns and password recovery pages
- [x] Add disabled-by-default server-only recovery-link diagnostic endpoint
- [x] Ensure endpoint requires explicit test env gate, shared diagnostic secret, and configured synthetic email
- [x] Ensure endpoint returns only safe success/error categories and never exposes action links or tokens
- [ ] Run lint/type validation and report whether generation was executed or not

## Acceptance
The current production recovery flow remains unchanged. A non-production operator can validate whether Supabase Admin generates a recovery action link only after configuring explicit test-only environment variables. No email is sent, no raw tokenized link is exposed, and no deployment is performed.