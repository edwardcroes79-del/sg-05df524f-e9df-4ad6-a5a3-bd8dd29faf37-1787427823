---
title: Turnstile Widget Visibility Fix
status: in_progress
priority: urgent
type: bug
tags: [security, registration, turnstile]
created_by: agent
created_at: 2026-10-10T15:08:55Z
position: 167
---

## Notes
Fix only the frontend Turnstile visibility issue on the existing customer signup form. Preserve Phase 2 server-side verification, Supabase Auth, SMTP, QR enrollment, database objects, RLS, customer records, and unrelated UI. The widget must visibly render on the New Account tab, expose clear localized loading/error/expired/retry messaging, use `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`, and continue sending `turnstileToken` to the existing `/api/auth/register-customer` endpoint.

## Checklist
- [x] Inspect `src/pages/auth/customer.tsx` Phase 1 widget code
- [x] Inspect `src/pages/api/auth/register-customer.ts` Phase 2 server verification remains enforced
- [ ] Add robust client-side Turnstile script readiness and explicit visible render state
- [ ] Add localized loading, expired, error, missing site key, and retry UI
- [ ] Verify public site key presence without exposing values
- [ ] Verify no secret key is exposed to browser code
- [ ] Run validation and report actual tests

## Acceptance
Turnstile is visibly rendered on New Account. A valid challenge produces a token and the existing API receives it. Missing or invalid tokens remain blocked. Sign In remains unaffected.