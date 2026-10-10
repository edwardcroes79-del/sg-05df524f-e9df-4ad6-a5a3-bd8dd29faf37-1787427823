---
title: Business Registration Turnstile Protection
status: in_progress
priority: urgent
type: bug
tags: [security, registration, turnstile]
created_by: agent
created_at: 2026-10-10T16:13:20Z
position: 169
---

## Notes
Audit and, only if confirmed absent, add Cloudflare Turnstile protection to the business registration flow. Identify the exact business registration page and API endpoint from current code. Reuse the existing customer registration Turnstile public key and server verification pattern. Preserve business registration fields, Supabase authentication, Super Admin notification, approval workflow, Nodemailer SMTP, redirects, database/RLS logic, business/staff/customer login, password recovery, and customer registration.

## Checklist
- [ ] Identify the business registration page and actual API endpoint from code
- [ ] Confirm whether frontend Turnstile rendering is absent or present
- [ ] Confirm whether the API verifies `CLOUDFLARE_TURNSTILE_SECRET_KEY` before registration side effects
- [ ] Reuse existing customer Turnstile approach where protection is missing
- [ ] Add visible Security Verification states above the Create Business Account button if needed
- [ ] Send token to the existing endpoint and reject missing/invalid/expired/failed tokens server-side
- [ ] Preserve approval, notification, SMTP, redirects, database/RLS, and unrelated auth flows
- [ ] Validate TypeScript/lint and report actual tests

## Acceptance
Business registration visibly renders Turnstile before account creation. The business registration API blocks missing or invalid tokens before side effects. Existing business approval and email flow are preserved. Customer registration, login flows, and password recovery remain unchanged.