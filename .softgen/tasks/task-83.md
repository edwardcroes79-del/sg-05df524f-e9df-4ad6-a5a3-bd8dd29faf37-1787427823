---
title: Quick Stamp QR Menu Access
status: in_progress
priority: high
type: bug
tags: [quick-stamp, dashboard, navigation]
created_by: agent
created_at: 2026-09-28T21:17:22Z
position: 83
---

## Notes
Fix Business Dashboard access to the existing Quick Stamp QR page. Quick Stamp QR must appear under the existing Stamps & Rewards navigation alongside Issue Stamp and Redeem Reward only when the business has the active Quick Stamp QR add-on. Opening it must route to the existing Quick Stamp QR UI/token system, including active loyalty program selection, QR code, 60-second countdown, automatic refresh, Refresh QR, and Display Full Screen. If the add-on is inactive, direct-route access must be prevented securely. Do not modify stamp RPC, QR security, redemption QR, billing, plans, RLS, or authentication.

## Checklist
- [ ] Inspect dashboard navigation and current Stamps & Rewards menu structure
- [ ] Inspect existing Quick Stamp QR route and add-on gating
- [ ] Add Quick Stamp QR menu item under Stamps & Rewards only for active add-on businesses
- [ ] Ensure the menu item routes to the existing Quick Stamp QR UI/token system
- [ ] Ensure multiple active loyalty programs can be selected from the existing page
- [ ] Ensure inactive add-on direct-route access is blocked or shows a secure unavailable state
- [ ] Validate menu visibility, route access, active/inactive add-on behavior, QR generation, and project checks

## Acceptance
Business users with the active Quick Stamp QR add-on can access Quick Stamp QR from Stamps & Rewards.
Business users without the active add-on do not see the operational menu entry and cannot use the direct route to generate QR tokens.
Existing stamp RPC, QR security, redemption QR, billing, plans, RLS, and authentication remain unchanged.