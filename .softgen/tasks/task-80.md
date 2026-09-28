---
title: Customer Quick Stamp Flow
status: in_progress
priority: urgent
type: feature
tags: [quick-stamp, customer-flow, qr, stamps]
created_by: agent
created_at: 2026-09-28T20:33:26Z
position: 80
---

## Notes
Build Phase 2 for the Quick Stamp QR add-on. Customer scans an active business Quick Stamp QR, the app validates the token, requires customer login, validates membership/program eligibility, shows a confirmation screen with business name, loyalty program, "You're about to receive 1 stamp", and a Get My Stamp action, then issues exactly one real stamp only after the database transaction succeeds. Must use existing secure stamp issuance logic/RPC and preserve existing staff/customer QR stamping. Server-side validation must check token validity, 60-second lifetime, active add-on, active business, active contract, active program, authenticated customer, customer membership/card, token not consumed, and existing duplicate protection. Expired/invalid QR must show: "QR Code expired. Please scan the current QR code." Do not use optimistic success, mock data, duplicate stamp systems, or changes to billing, plans, RLS, business isolation, auth, or existing stamp history.

## Checklist
- [ ] Inspect existing Quick Stamp QR token foundation and dashboard QR route payload
- [ ] Inspect existing secure stamp issuance RPC and duplicate-protection rules
- [ ] Add server-side Quick Stamp QR validation and consume-and-issue stamp flow using existing stamp RPC
- [ ] Add customer scan route that requires login and loads real business/program/card data
- [ ] Add confirmation screen with business name, loyalty program, and Get My Stamp action
- [ ] Show success only after the database transaction succeeds and refresh customer card data
- [ ] Show the exact expired/invalid QR message for invalid, expired, inactive, or consumed tokens
- [ ] Preserve existing staff/customer QR stamping, RLS, business isolation, auth, billing, plans, and add-ons
- [ ] Test valid stamp issuance, login requirement, invalid/expired/consumed token, inactive add-on, inactive business, inactive contract, inactive program, non-member customer, and duplicate protection
- [ ] Run project validation

## Acceptance
Customers can scan a current Quick Stamp QR, confirm, and receive exactly one real stamp through the existing stamp issuance logic.
Expired, invalid, or consumed Quick Stamp QR tokens do not issue stamps and show the requested expired QR message.
Existing staff/customer QR stamping, RLS, business isolation, auth, billing, plans, and add-ons remain unchanged.