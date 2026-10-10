---
title: SMTP Password Recovery Flow
status: in_progress
priority: urgent
type: feature
tags: [auth, password-recovery, smtp, security]
created_by: agent
created_at: 2026-10-10T18:09:07Z
position: 175
---

## Notes
Implement password recovery email delivery through the existing server-side Nodemailer SMTP infrastructure while preserving Supabase Auth recovery-link generation, token validation, session establishment, and password updates. Scope is password recovery only. Do not change registration, login, Supabase SMTP settings, environment variables, database objects, deployment state, or existing update-password behavior beyond compatibility checks. Do not send test emails during implementation validation. Endpoint must validate email, verify Turnstile, enforce server-side rate limiting, allowlist redirect URLs, use service-role key server-side only, generate a Supabase recovery link via Admin API, send the returned action link via existing SMTP configuration, avoid account enumeration, and never log or expose recovery links/tokens/credentials.

## Checklist
- [ ] Inspect existing registration SMTP/Admin patterns, Turnstile helper, Supabase client, reset page, and update-password page
- [ ] Add a dedicated server-side password recovery request endpoint with email validation, Turnstile verification, redirect allowlisting, and conservative server-side rate limiting
- [ ] Generate Supabase Admin recovery links server-side and send only the returned action link through existing Nodemailer SMTP configuration
- [ ] Update the existing reset page to call the recovery API while preserving design, localization, validation, loading, and generic confirmation behavior
- [ ] Verify service-role credentials stay server-side and recovery links/tokens are not logged or returned
- [ ] Run lint/type/build checks without sending recovery emails and report untested end-to-end cases

## Acceptance
Users can request password recovery through the existing reset page without relying on Supabase Auth email delivery. The public response does not reveal account existence. Supabase remains responsible for recovery token validation and password update sessions.