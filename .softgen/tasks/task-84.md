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
Debug why Quick Issue Stamp is still not visible for tested business accounts. Trace the complete feature chain: add-on definition, add-on status/approval, business entitlement/access check, feature-access helper, navigation visibility, route, Quick Issue Stamp page, and existing 60-second QR/token implementation. Do not simply add another menu item. If the backend exists but UI entitlement check is wrong, connect the existing implementation. Do not rebuild QR/token/stamp systems and do not modify Issue Stamp, Redeem Reward, billing, plans, RLS, authentication, or existing stamp logic.

## Checklist
- [x] Inspect existing Quick Stamp QR page, token RPC usage, add-on gating, and dashboard navigation
- [ ] Verify add-on definition, slug/key, active/approval fields, and available metadata
- [ ] Verify business add-on entitlement rows and status values used by real business accounts
- [ ] Inspect feature-access helper and navigation condition for mismatched slug/status/field logic
- [ ] Inspect route/page registration and direct-route add-on gate
- [ ] Apply the smallest fix to connect existing implementation if backend exists
- [ ] Validate active add-on menu visibility, inactive add-on hiding, route access, QR generation, and project checks
- [ ] Report root cause and changed files

## Acceptance
Business users with the active Quick Issue Stamp add-on see Quick Issue Stamp under Stamps & Rewards.
Business users without the active add-on do not see the submenu item and cannot use the direct route to generate Quick Issue Stamp QR tokens.
Issue Stamp, Redeem Reward, billing, plans, RLS, authentication, redemption QR, and existing stamp logic remain unchanged.