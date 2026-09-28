---
title: Quick Stamp QR Security and QA
status: done
priority: urgent
type: feature
tags: [quick-stamp, security, qa, stamps]
created_by: agent
created_at: 2026-09-28T20:44:38Z
position: 81
---

## Notes
Hardened Phase 1–2 Quick Stamp QR add-on with server-side anti-abuse protection. Added Quick Stamp-specific repeat-scan protection that checks existing immutable stamp transaction history before issuing another `quick_stamp_qr` stamp for the same customer, business, loyalty program, and loyalty card within the configured cooldown period. The cooldown is configurable through the existing Quick Stamp QR add-on metadata (`customer_cooldown_seconds`) with a safe default, and server/database time remains authoritative for token expiration and cooldown checks. Refreshed QR generation creates new tokens, expired tokens are rejected, consumed tokens are rejected, and token consumption only succeeds while the token is still valid. Existing staff/customer QR stamping, RLS, business isolation, stamp history, billing, plans, add-ons, authentication, and existing stamp UX were preserved. Targeted server-side QA passed for inactive add-on, expired contract, inactive program, invalid token, expired token, reused token, rapid repeated refreshed-token requests, exactly-one successful stamp/card update, and failed transaction/no false success. Project validation passed with no CSS, lint, TypeScript, or server errors.

## Checklist
- [x] Inspect Quick Stamp QR token generation, validation, consumption, and customer scan route
- [x] Add server-side self-stamp/rapid-repeat protection using existing transaction history
- [x] Keep cooldown/idempotency configurable through add-on metadata where practical
- [x] Ensure refreshed QR generates a new token and expired/consumed tokens never issue stamps
- [x] Verify add-on inactive, contract expired, program inactive, invalid/expired token, reused token, rapid repeated requests, success, and failed transaction cases
- [x] Verify desktop/mobile scan route and customer card update behavior
- [x] Preserve RLS, business isolation, stamp history, and existing staff/customer QR flows
- [x] Run project validation

## Acceptance
Quick Stamp QR issues exactly one real stamp for a valid eligible scan and never shows false success.
Expired, consumed, inactive, unauthorized, or rapid repeated requests do not issue stamps.
Existing staff/customer QR stamping, RLS, business isolation, and stamp history remain unchanged.