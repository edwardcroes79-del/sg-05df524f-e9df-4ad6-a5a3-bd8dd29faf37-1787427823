---
title: Corporate location-aware loyalty backend
status: done
priority: high
type: feature
tags: [corporate-plan, qr, quick-qr, stamps, rewards]
created_by: agent
created_at: 2026-10-07T13:28:34Z
position: 131
---

## Notes
Add Corporate location attribution to existing loyalty operations without redesigning the UI or changing unrelated behavior. Preserve existing program QR, Quick QR add-on behavior for lower plans, stamp issuance, reward redemption, customer loyalty balances, and printed QR compatibility. Corporate Quick QR must work through plan entitlement without an add-on record.

## Checklist
- [x] Extend location-specific QR support without breaking existing QR rows/routes
- [x] Update manual stamp backend flow to accept optional location and enforce assigned-location access
- [x] Update Quick QR token/stamp backend flow to support optional location and Corporate plan entitlement
- [x] Record earned/redeemed location where applicable while preserving shared customer balances
- [x] Ensure Corporate downgrade recalculates Quick QR through existing add-on/plan entitlement rules
- [x] Test Corporate Quick QR without add-on and lower-plan Quick QR add-on behavior unchanged
- [x] Run validation and regression checks for Trial, Starter, Business, Professional, and Corporate

## Acceptance
Location-aware QR, manual stamps, Quick QR stamps, and reward redemption are supported for Corporate.
Lower-plan QR/Quick QR/stamp/reward behavior remains unchanged.
Customers remain one profile under the business and can earn/redeem across allowed locations.