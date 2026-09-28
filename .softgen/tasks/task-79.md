---
title: Quick Stamp QR Add-on Foundation
status: in_progress
priority: urgent
type: feature
tags: [addons, quick-stamp-qr, qr, stamps]
created_by: agent
created_at: 2026-09-28T20:14:17Z
position: 79
---

## Notes
Build Phase 1 for the optional Quick Stamp QR add-on. This is not a plan feature; it must use the existing add-ons request and Super Admin approval system. Inspect and reuse the existing 60-second Reward Redemption QR/token architecture where possible. Quick Stamp QR tokens must expire after 60 seconds and automatically refresh with a new token. The QR must not permanently authorize stamps. This phase must not build the customer scanning flow. Use existing secure stamp issuance logic/RPC rather than creating a separate stamp system. Do not change existing stamp functionality, billing, plans, RLS, authentication, or customer scanning behavior.

## Checklist
- [ ] Inspect existing Reward Redemption QR/token implementation and secure stamp issuance RPC
- [ ] Inspect existing add-ons request, approval, and active entitlement architecture
- [ ] Add Quick Stamp QR as an optional add-on in the existing add-ons system
- [ ] Add short-lived 60-second Quick Stamp QR token generation using the existing secure token pattern where possible
- [ ] Add Business Dashboard availability only after Super Admin approval activates the add-on
- [ ] Ensure Quick Stamp QR auto-refreshes with a new token every 60 seconds
- [ ] Ensure tokens do not permanently authorize stamps and no customer scanning flow is built yet
- [ ] Preserve existing stamp functionality, billing, plans, RLS, authentication, and access-control behavior
- [ ] Test add-on request, Super Admin approval availability, token expiry/refresh, and validation

## Acceptance
Businesses can request Quick Stamp QR through the existing add-ons system and Super Admin can approve it.
Approved businesses can access a dashboard Quick Stamp QR that refreshes to a new 60-second token.
No customer scanning flow is built, and existing stamp, billing, plan, RLS, and authentication behavior remains unchanged.