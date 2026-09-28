---
title: Quick Stamp QR Add-on Foundation
status: done
priority: urgent
type: feature
tags: [addons, quick-stamp, qr, tokens]
created_by: agent
created_at: 2026-09-28T20:16:00Z
position: 79
---

## Notes
Built Phase 1 of the optional Quick Stamp QR add-on through the existing add-ons system. Added the Quick Stamp QR add-on type to the existing Super Admin add-on management API and business add-on request flow, while preserving the existing approval process. Approved active Quick Stamp QR subscriptions unlock a Business Dashboard navigation item and auto-refreshing QR page. Added `quick_stamp_qr_tokens` plus secure RPC helpers for approved businesses to generate short-lived 60-second tokens with automatic rotation and no permanent stamp authorization. The foundation reuses existing business/add-on entitlement patterns and does not create a separate stamp issuance system or customer scanning flow. Billing, plans, existing stamp functionality, RLS, and authentication behavior were not changed. Targeted entitlement/token regression passed, including inactive add-on denial, active add-on approval, new token generation, 60-second expiration, stale token invalidation, and clean project validation.

## Checklist
- [x] Inspect existing reward redemption QR/token implementation
- [x] Inspect existing add-ons request and approval system
- [x] Add Quick Stamp QR as an optional add-on type in the existing add-ons system
- [x] Allow businesses to request Quick Stamp QR through existing add-on request flow
- [x] Preserve Super Admin approval before feature activation
- [x] Add approved-only dashboard navigation and Quick Stamp QR page
- [x] Add secure 60-second token generation and automatic token refresh foundation
- [x] Ensure QR tokens do not permanently authorize stamp issuance
- [x] Avoid building customer scanning flow in this phase
- [x] Preserve existing stamp, billing, plan, RLS, and authentication behavior
- [x] Run entitlement/token regression checks and project validation

## Acceptance
Quick Stamp QR is available only as an approved active add-on.
The Business Dashboard shows a rotating 60-second Quick Stamp QR only after Super Admin approval.
No customer scanning flow is built, and existing stamp, billing, plan, RLS, and authentication behavior remains unchanged.