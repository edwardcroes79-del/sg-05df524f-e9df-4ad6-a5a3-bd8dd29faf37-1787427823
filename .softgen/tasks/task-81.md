---
title: Quick Stamp QR Security and QA
status: in_progress
priority: urgent
type: feature
tags: [quick-stamp, security, qa, stamps]
created_by: agent
created_at: 2026-09-28T20:44:38Z
position: 81
---

## Notes
Harden Phase 1–2 Quick Stamp QR add-on with server-side anti-abuse protection. Scope is limited to Quick Stamp QR security and QA: prevent one customer from repeatedly scanning refreshed tokens to generate unlimited stamps, use existing stamp transaction history and configurable cooldown/idempotency where practical, keep server/database time authoritative, and preserve RLS, business isolation, stamp history, existing staff/customer QR flows, billing, plans, add-ons, authentication, and existing stamp UX. Do not redesign existing stamp functionality.

## Checklist
- [ ] Inspect Quick Stamp QR token generation, validation, consumption, and customer scan route
- [ ] Add server-side self-stamp/rapid-repeat protection using existing transaction history
- [ ] Keep cooldown/idempotency configurable through add-on metadata where practical
- [ ] Ensure refreshed QR generates a new token and expired/consumed tokens never issue stamps
- [ ] Verify add-on inactive, contract expired, program inactive, invalid/expired token, reused token, rapid repeated requests, success, and failed transaction cases
- [ ] Verify desktop/mobile scan route and customer card update behavior
- [ ] Preserve RLS, business isolation, stamp history, and existing staff/customer QR flows
- [ ] Run project validation

## Acceptance
Quick Stamp QR issues exactly one real stamp for a valid eligible scan and never shows false success.
Expired, consumed, inactive, unauthorized, or rapid repeated requests do not issue stamps.
Existing staff/customer QR stamping, RLS, business isolation, and stamp history remain unchanged.