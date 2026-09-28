---
title: Customer Quick Stamp Flow
status: done
priority: urgent
type: feature
tags: [quick-stamp, customer-flow, qr, stamps]
created_by: agent
created_at: 2026-09-28T20:33:26Z
position: 80
---

## Notes
Built Phase 2 for the Quick Stamp QR add-on. Customers can scan an active business Quick Stamp QR, the app validates the short-lived token, requires customer login when needed, validates membership/program eligibility, shows a confirmation screen with business name, loyalty program, "You're about to receive 1 stamp", and a Get My Stamp action, then issues exactly one real stamp only after the database transaction succeeds. The implementation uses the existing secure stamp issuance logic/RPC and preserves existing staff/customer QR stamping. Server-side validation checks token validity, 60-second lifetime, active add-on, active business, active contract, active program, authenticated customer, customer membership/card, token not consumed, and duplicate protection. Expired, invalid, inactive, or consumed QR tokens show: "QR Code expired. Please scan the current QR code." No optimistic success, mock data, duplicate stamp systems, or changes to billing, plans, RLS, business isolation, auth, or existing stamp history were introduced. Targeted regression checks passed for all required cases, and project validation passed.

## Checklist
- [x] Inspect existing Quick Stamp QR token foundation and dashboard QR route payload
- [x] Inspect existing secure stamp issuance RPC and duplicate-protection rules
- [x] Add server-side Quick Stamp QR validation and consume-and-issue stamp flow using existing stamp RPC
- [x] Add customer scan route that requires login and loads real business/program/card data
- [x] Add confirmation screen with business name, loyalty program, and Get My Stamp action
- [x] Show success only after the database transaction succeeds and refresh customer card data
- [x] Show the exact expired/invalid QR message for invalid, expired, inactive, or consumed tokens
- [x] Preserve existing staff/customer QR stamping, RLS, business isolation, auth, billing, plans, and add-ons
- [x] Test valid stamp issuance, login requirement, invalid/expired/consumed token, inactive add-on, inactive business, inactive contract, inactive program, non-member customer, and duplicate protection
- [x] Run project validation

## Acceptance
Customers can scan a current Quick Stamp QR, confirm, and receive exactly one real stamp through the existing stamp issuance logic.
Expired, invalid, or consumed Quick Stamp QR tokens do not issue stamps and show the requested expired QR message.
Existing staff/customer QR stamping, RLS, business isolation, auth, billing, plans, and add-ons remain unchanged.