---
title: Turnstile Phase 1 Frontend Widget
status: in_progress
priority: urgent
type: feature
tags: [security, registration, turnstile]
created_by: agent
created_at: 2026-10-10T14:45:00Z
position: 165
---

## Checklist
- [x] Inject Cloudflare Turnstile script into `/auth/customer`
- [x] Render Turnstile widget securely on the signup tab (explicit render)
- [x] Capture the `turnstileToken` state
- [x] Validate token presence before form submission
- [x] Include `turnstileToken` in the `/api/auth/register-customer` POST payload
- [x] Add translation strings for Turnstile security prompts in English, Spanish, and Papiamento
- [x] Ensure existing login and QR enrollment flows are unmodified
- [x] Prevent duplicate submissions while token is processed
- [ ] Test frontend integration

## Acceptance
Turnstile widget appears only on the new-customer signup form. Signup prevents submission without token. Token is correctly captured and sent in the payload. Existing flows remain unchanged. No raw translation keys are visible.