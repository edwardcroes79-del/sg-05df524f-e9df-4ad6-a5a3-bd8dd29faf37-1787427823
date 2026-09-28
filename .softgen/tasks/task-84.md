---
title: Quick Issue Stamp Dashboard Access
status: in_progress
priority: high
type: bug
tags: [quick-issue-stamp, dashboard, qr, add-on]
created_by: agent
created_at: 2026-09-28T23:23:47Z
position: 84
---

## Notes
Correct the Business Dashboard navigation so Quick Issue Stamp appears as a third separate item under the existing Stamps & Rewards menu, after Issue Stamp and Redeem Reward, only when the active add-on is enabled. Reuse the existing Quick Issue Stamp page/token/customer scan implementation from previous phases. Do not rebuild QR, token, stamp, billing, RLS, authentication, or redemption systems. Direct-route access must remain blocked or unavailable when the add-on is inactive.

## Checklist
- [x] Inspect existing Quick Stamp QR page, token RPC usage, add-on gating, and dashboard navigation
- [ ] Move Quick Issue Stamp into the Stamps & Rewards submenu as a separate third item
- [ ] Ensure the submenu item only appears when the Quick Issue Stamp add-on is active
- [ ] Ensure the submenu item opens the existing Quick Issue Stamp implementation
- [ ] Verify inactive add-on hides the menu item and direct route remains unavailable
- [ ] Confirm existing page still supports active program selection, 60-second QR, countdown, Refresh QR, and Display Full Screen
- [ ] Run project validation

## Acceptance
Business users with the active Quick Issue Stamp add-on see Quick Issue Stamp under Stamps & Rewards.
Business users without the active add-on do not see the submenu item and cannot use the direct route to generate Quick Issue Stamp QR tokens.
Issue Stamp, Redeem Reward, billing, plans, RLS, authentication, redemption QR, and existing stamp logic remain unchanged.