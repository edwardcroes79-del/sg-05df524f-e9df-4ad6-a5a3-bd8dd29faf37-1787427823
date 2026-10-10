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
- [ ] Inject Cloudflare Turnstile script into `/auth/customer`
- [ ] Render Turnstile widget securely on the signup tab (explicit render)
- [ ] Capture the `turnstileToken` state
- [ ] Validate token presence before form submission
- [ ] Include `turnstileToken` in the `/api/auth/register-customer` POST payload
- [ ] Add translation strings for Turnstile security prompts in English, Spanish, and Papiamento
- [ ] Ensure existing login and QR enrollment flows are unmodified
- [ ] Prevent duplicate submissions while token is processed
- [ ] Test frontend integration

## Acceptance
Turnstile widget appears only on the new-customer signup form. Signup prevents submission without token. Token is correctly captured and sent in the payload. Existing flows remain unchanged. No raw translation keys are visible.