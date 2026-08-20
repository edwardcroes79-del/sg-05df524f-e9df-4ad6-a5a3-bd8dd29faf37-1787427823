---
title: Realtime Rate Limiting and Subscription Security Audit
status: in_progress
priority: urgent
type: bug
tags: [realtime, rate-limiting, subscriptions, security]
created_by: agent
created_at: 2026-08-20T02:30:33Z
position: 13
---

## Notes
Phase 5 audit scoped only to realtime subscriptions, abuse/rate limiting, and subscription entitlement security. Verify stamp, loyalty card, reward, redemption, and supported branding realtime flows; inspect duplicate subscription lifecycle cleanup and RLS-safe filtering. Review login, password reset, registration, stamp issuing, reward redemption, staff creation, QR-related routes, and API endpoints for duplicate/abusive request protection. Verify users cannot unlock higher plans, staff/member limits, premium templates, or feature entitlements by modifying frontend state.

## Checklist
- [ ] Inspect realtime usage in business, customer, reward, stamp, QR, and branding flows
- [ ] Verify Supabase realtime publication and RLS-safe table filtering
- [ ] Identify duplicate subscriptions, missing cleanup, reconnect gaps, or polling/page-refresh workarounds
- [ ] Review auth and API flows for duplicate request and abuse protection
- [ ] Review staff creation, stamp issuing, reward redemption, and QR flows for server-side rate/authorization checks
- [ ] Verify subscription plan limits and premium entitlements are enforced server-side or database-side
- [ ] Apply focused fixes for verified critical/high issues only
- [ ] Test realtime/security behavior after fixes
- [ ] Run project error checks

## Acceptance
Realtime updates are filtered to the correct tenant/customer and clean up correctly, sensitive actions have abuse protection, and subscription entitlements cannot be bypassed through frontend state changes.