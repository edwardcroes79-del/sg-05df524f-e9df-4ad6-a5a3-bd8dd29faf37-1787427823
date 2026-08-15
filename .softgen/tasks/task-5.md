---
title: Phase 5 - Digital Cards, QR Codes & Rewards
status: in_progress
priority: urgent
type: feature
tags: [cards, qr-codes, rewards, redemption]
created_by: agent
---

## Notes
Build customizable digital loyalty cards, real QR code joining system, printable QR posters, and secure reward redemption preventing double use.

## Checklist
- [ ] Add card customization columns to `loyalty_programs` (template, icons).
- [ ] Create `redeem_reward` RPC function to securely prevent double redemption.
- [ ] Build `/join/[business_slug]/[program_id]` public route for customers.
- [ ] Create beautiful digital card templates component.
- [ ] Build Business QR Code & Poster generator (`/dashboard/programs/[id]/qr`).
- [ ] Build Staff Reward verification and redemption UI.

## Acceptance
- Customers can join programs via real QR routes.
- Businesses can customize cards and print posters.
- Staff can redeem rewards, preventing double redemption.