---
title: SMTP Password Recovery Flow
status: done
priority: urgent
type: feature
tags: [auth, password-recovery, smtp, security]
created_by: agent
created_at: 2026-10-10T18:09:07Z
position: 175
---

## Notes
Implemented password recovery email delivery through the existing server-side Nodemailer SMTP infrastructure while preserving Supabase Auth recovery-link generation, token validation, session establishment, and password updates. Scope is password recovery only. Registration, login, Supabase SMTP settings, environment variables, database objects, deployment state, and update-password behavior were not changed. No test emails were sent during implementation validation. Endpoint validates email, verifies Turnstile, enforces server-side rate limiting through the existing Supabase-backed api_rate_limits table pattern, allowlists recovery redirects, uses service-role key server-side only, generates a Supabase recovery link via Admin API, sends the returned action link via existing SMTP configuration, avoids account enumeration, and never logs or exposes recovery links/tokens/credentials. Static checks passed with existing project warnings. Production build reached successful compilation, then the sandbox process was killed during page-data collection, so full build completion could not be confirmed in this environment.

## Checklist
- [x] Inspect existing registration SMTP/Admin patterns, Turnstile helper, Supabase client, reset page, and update-password page
- [x] Add a dedicated server-side password recovery request endpoint with email validation, Turnstile verification, redirect allowlisting, and conservative server-side rate limiting
- [x] Generate Supabase Admin recovery links server-side and send only the returned action link through existing Nodemailer SMTP configuration
- [x] Update the existing reset page to call the recovery API while preserving design, localization, validation, loading, and generic confirmation behavior
- [x] Verify service-role credentials stay server-side and recovery links/tokens are not logged or returned
- [x] Run lint/type/build checks without sending recovery emails and report untested end-to-end cases

## Acceptance
Users can request password recovery through the existing reset page without relying on Supabase Auth email delivery. The public response does not reveal account existence. Supabase remains responsible for recovery token validation and password update sessions.