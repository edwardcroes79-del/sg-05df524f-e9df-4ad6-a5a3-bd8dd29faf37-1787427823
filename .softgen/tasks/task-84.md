---
title: Quick Issue Stamp Dashboard Access
status: done
priority: high
type: bug
tags: [quick-issue-stamp, dashboard, qr, add-on]
created_by: agent
created_at: 2026-09-28T23:23:47Z
position: 84
---

## Notes
Fixed the Business Dashboard so the active add-on feature is presented as a separate Quick Issue Stamp menu item, not combined with Issue Stamp or Redeem Reward. Reused the existing Quick Stamp QR/token/customer scan implementation from previous phases. Business opens Quick Issue Stamp, selects an active loyalty program, displays a large rotating 60-second QR, customer scans and authenticates, confirms, and receives exactly one real stamp through the existing secure stamp issuance logic. Issue Stamp, Redeem Reward, stamp RPC, billing, plans, RLS, authentication, redemption QR, and security rules were not modified. No permanent QR or second stamp system was created. Expired/reused tokens remain rejected. Project validation passed with no CSS, lint, TypeScript, or server errors.

## Checklist
- [x] Inspect existing Quick Stamp QR page, token RPC usage, add-on gating, and dashboard navigation
- [x] Add a separate Quick Issue Stamp dashboard menu item only when the active add-on is enabled
- [x] Ensure Quick Issue Stamp opens the existing QR/token UI rather than a new implementation
- [x] Update visible page/menu copy to Quick Issue Stamp with "Show this QR to customers" and "Customers scan to receive their loyalty stamp."
- [x] Confirm active loyalty program selector, large QR, 60-second countdown, automatic refresh, Refresh QR, and Display Full Screen remain available
- [x] Verify customer scan still requires authentication and issues exactly one real stamp through the existing secure logic
- [x] Test active/inactive add-on menu visibility, route access, QR generation, expired/reused token rejection, and project validation

## Acceptance
Business users with the active Quick Issue Stamp add-on see a separate Quick Issue Stamp menu item and can open the existing rotating QR display.
Customers scanning the current QR authenticate, confirm, and receive exactly one real stamp with customer card updates.
Issue Stamp, Redeem Reward, stamp RPC, billing, plans, RLS, authentication, redemption QR, and existing security behavior remain unchanged.