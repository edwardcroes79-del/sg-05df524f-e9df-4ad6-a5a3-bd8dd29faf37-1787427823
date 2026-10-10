---
title: Business Registration Turnstile Protection
status: done
priority: urgent
type: bug
tags: [security, registration, turnstile]
created_by: agent
created_at: 2026-10-10T16:13:20Z
position: 169
---

## Notes
Audited and added Cloudflare Turnstile protection to the business registration flow. The exact business registration page is `src/pages/auth/register.tsx`, and the exact API endpoint is `src/pages/api/auth/register-business.ts`. The frontend now renders visible security verification using the existing public Turnstile site key and localized customer Turnstile messages. The API verifies the submitted token with `CLOUDFLARE_TURNSTILE_SECRET_KEY` before Supabase Admin link generation, SMTP email sending, or registration side effects. Preserved business registration fields, Supabase authentication, Super Admin notification path, approval workflow, Nodemailer SMTP, redirects, database/RLS logic, business/staff/customer login, password recovery, and customer registration.

## Checklist
- [x] Identify the business registration page and actual API endpoint from code
- [x] Confirm whether frontend Turnstile rendering is absent or present
- [x] Confirm whether the API verifies `CLOUDFLARE_TURNSTILE_SECRET_KEY` before registration side effects
- [x] Reuse existing customer Turnstile approach where protection is missing
- [x] Add visible Security Verification states above the Create Business Account button if needed
- [x] Send token to the existing endpoint and reject missing/invalid/expired/failed tokens server-side
- [x] Preserve approval, notification, SMTP, redirects, database/RLS, and unrelated auth flows
- [x] Validate TypeScript/lint and report actual tests

## Acceptance
Business registration visibly renders Turnstile before account creation. The business registration API blocks missing or invalid tokens before side effects. Existing business approval and email flow are preserved. Customer registration, login flows, and password recovery remain unchanged.