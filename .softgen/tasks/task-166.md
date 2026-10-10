---
title: Turnstile Phase 2 Server Verification
status: in_progress
priority: urgent
type: feature
tags: [security, registration, turnstile]
created_by: agent
created_at: 2026-10-10T14:59:52Z
position: 166
---

## Notes
Implement server-side Cloudflare Turnstile enforcement in the existing customer registration API only. Preserve the existing Supabase Auth signup-link flow, email validation, registration checks, confirmation email behavior, login, password reset, QR enrollment, SMTP settings, database objects, RLS policies, and customer records. The secret key must be read only on the server and never exposed or logged. Verification must occur before generating the Supabase signup link or sending confirmation email. Fail safely if the secret is unavailable, token is missing/invalid/expired/reused, or Siteverify has timeout/network/errors.

## Checklist
- [x] Inspect Phase 1 frontend token payload in `src/pages/auth/customer.tsx`
- [x] Inspect existing registration API flow in `src/pages/api/auth/register-customer.ts`
- [x] Add server-only Siteverify request using `CLOUDFLARE_TURNSTILE_SECRET_KEY`
- [x] Validate missing, invalid, expired, reused, timeout, and Cloudflare error cases before signup link generation
- [x] Preserve existing registration validation, Supabase signup-link generation, and email sending behavior
- [x] Verify no Turnstile secret is exposed in browser code
- [ ] Run project validation and report actual tests/untested cases

## Acceptance
Customer signup proceeds only after successful server-side Turnstile verification. Failed verification does not generate a signup link or send confirmation email. Existing login, password reset, QR enrollment, SMTP configuration, database objects, and RLS policies remain unchanged.