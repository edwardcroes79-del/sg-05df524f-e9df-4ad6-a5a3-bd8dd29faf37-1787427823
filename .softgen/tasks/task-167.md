---
title: Turnstile Widget Visibility Fix
status: done
priority: urgent
type: bug
tags: [security, registration, turnstile]
created_by: agent
created_at: 2026-10-10T15:08:55Z
position: 167
---

## Notes
Fixed only the frontend Turnstile visibility issue on the existing customer signup form. Preserved Phase 2 server-side verification, Supabase Auth, SMTP, QR enrollment, database objects, RLS, customer records, and unrelated UI. The widget now has explicit script readiness, visible loading/error/expired/retry states, uses `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`, and continues sending `turnstileToken` to the existing `/api/auth/register-customer` endpoint.

## Checklist
- [x] Inspect `src/pages/auth/customer.tsx` Phase 1 widget code
- [x] Inspect `src/pages/api/auth/register-customer.ts` Phase 2 server verification remains enforced
- [x] Add robust client-side Turnstile script readiness and explicit visible render state
- [x] Add localized loading, expired, error, missing site key, and retry UI
- [x] Verify public site key presence without exposing values
- [x] Verify no secret key is exposed to browser code
- [x] Run validation and report actual tests

## Acceptance
Turnstile is visibly rendered on New Account. A valid challenge produces a token and the existing API receives it. Missing or invalid tokens remain blocked. Sign In remains unaffected.